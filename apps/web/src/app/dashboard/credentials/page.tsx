import type { Metadata } from "next";
import Link from "next/link";

import { InstitutionSetupState } from "../../../components/institution-setup-state";
import type { CredentialsResponse } from "../../../lib/api";
import {
  getCredentials,
  getCurrentAdmin,
  getSessionToken,
  isInstitutionSetupRequired,
} from "../../../lib/api";
import { getServerDictionary } from "../../../lib/i18n-server";
import { CredentialsTable } from "./credentials-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return { title: t.metadata.registryTitle };
}

interface CredentialsPageProps {
  searchParams: Promise<{
    studentId?: string;
    studentName?: string;
    status?: string;
    year?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 25;

export default async function CredentialsPage({
  searchParams,
}: CredentialsPageProps) {
  const token = await getSessionToken();
  if (!token) return null;
  const t = await getServerDictionary();

  const {
    studentId = "",
    studentName = "",
    status = "all",
    year = "",
    page = "1",
  } = await searchParams;
  const revoked =
    status === "active" ? false : status === "revoked" ? true : undefined;
  const issuedYear = Number(year) || undefined;
  const currentPage = Math.max(1, Number(page) || 1);

  const admin = await getCurrentAdmin(token);
  const isSuperAdmin = admin.role === "OWNER" || admin.role === "SUPER_ADMIN";
  let credentials: CredentialsResponse;

  try {
    credentials = await getCredentials(token, {
      studentId: studentId || undefined,
      studentName: studentName || undefined,
      revoked,
      issuedYear,
      page: currentPage,
      pageSize: PAGE_SIZE,
    });
  } catch (error) {
    if (isInstitutionSetupRequired(error)) {
      return <InstitutionSetupState isSuperAdmin={isSuperAdmin} />;
    }
    throw error;
  }

  const totalPages = Math.max(1, Math.ceil(credentials.total / PAGE_SIZE));
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (studentName) params.set("studentName", studentName);
    if (studentId) params.set("studentId", studentId);
    if (year) params.set("year", year);
    if (status !== "all") params.set("status", status);
    params.set("page", String(target));
    return `/dashboard/credentials?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Page header with inline filter */}
      <div className="pb-5 border-b border-[hsl(var(--border-default))]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-5">
          <div>
            <p className="kicker mb-2">{t.dashboard.registry.title}</p>
            <h1 className="page-title">{t.dashboard.registry.title}</h1>
            <p className="body-text mt-1">
              {credentials.total}{" "}
              {credentials.total === 1
                ? t.common.recordsSingular
                : t.common.recordsPlural}
            </p>
          </div>
          {/* Issue button hidden for AUDITOR */}
          {admin.role !== "AUDITOR" && (
            <Link href="/dashboard/issue" className="btn-primary btn-sm sm:mt-1 self-start">
              {t.dashboard.registry.issueCredential}
            </Link>
          )}
        </div>

        {/* Filter */}
        <form className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-end gap-3">
          <div className="lg:min-w-40 lg:flex-1">
            <label htmlFor="studentName" className="field-label">
              {t.dashboard.registry.studentName}
            </label>
            <input
              id="studentName"
              name="studentName"
              defaultValue={studentName}
              placeholder={t.dashboard.registry.namePlaceholder}
              className="field-shell w-full"
            />
          </div>
          <div className="lg:min-w-35 lg:flex-1">
            <label htmlFor="studentId" className="field-label">
              {t.dashboard.registry.studentId}
            </label>
            <input
              id="studentId"
              name="studentId"
              defaultValue={studentId}
              placeholder={t.dashboard.registry.studentIdPlaceholder}
              className="field-shell w-full font-mono"
            />
          </div>
          <div className="lg:w-36">
            <label htmlFor="year" className="field-label">
              {t.dashboard.registry.graduationYear}
            </label>
            <select
              id="year"
              name="year"
              defaultValue={year}
              className="field-shell w-full font-mono"
            >
              <option value="">{t.dashboard.registry.allYears}</option>
              {credentials.issuedYears.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:w-40">
            <label htmlFor="status" className="field-label">
              {t.common.status}
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              className="field-shell w-full"
            >
              <option value="all">{t.dashboard.registry.allStatuses}</option>
              <option value="active">{t.dashboard.registry.activeOnly}</option>
              <option value="revoked">{t.dashboard.registry.revokedOnly}</option>
            </select>
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <button type="submit" className="btn-ghost flex-1 lg:flex-none">
              {t.dashboard.registry.applyFilters}
            </button>
            {(studentName || studentId || status !== "all" || year) && (
              <Link
                href="/dashboard/credentials"
                className="btn-ghost flex-1 lg:flex-none text-[hsl(var(--text-tertiary))]"
              >
                {t.common.clear}
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Table client component handles selection and bulk actions */}
      <CredentialsTable credentials={credentials} role={admin.role} />

      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-3">
          {currentPage > 1 ? (
            <Link href={pageHref(currentPage - 1)} className="btn-ghost btn-sm">
              {t.common.previous}
            </Link>
          ) : (
            <span />
          )}
          <p className="text-xs text-[hsl(var(--text-tertiary))] font-mono">
            {t.common.pageLabel} {currentPage} {t.common.ofLabel} {totalPages}
          </p>
          {currentPage < totalPages ? (
            <Link href={pageHref(currentPage + 1)} className="btn-ghost btn-sm">
              {t.common.next}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
