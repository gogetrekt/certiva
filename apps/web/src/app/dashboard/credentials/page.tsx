import Link from "next/link";

import { DeleteCredentialButton } from "../../../components/delete-credential-button";
import { EmptyState } from "../../../components/empty-state";
import { InstitutionSetupState } from "../../../components/institution-setup-state";
import { RevokeCredentialButton } from "../../../components/revoke-credential-button";
import { StatusBadge } from "../../../components/status-badge";
import type { CredentialsResponse } from "../../../lib/api";
import {
  getCredentials,
  getCurrentAdmin,
  getSessionToken,
  isInstitutionSetupRequired,
} from "../../../lib/api";
import { formatDate } from "../../../lib/date-format";

interface CredentialsPageProps {
  searchParams: Promise<{
    studentId?: string;
    studentName?: string;
    status?: string;
  }>;
}

export default async function CredentialsPage({
  searchParams,
}: CredentialsPageProps) {
  const token = await getSessionToken();
  if (!token) return null;

  const {
    studentId = "",
    studentName = "",
    status = "all",
  } = await searchParams;
  const revoked =
    status === "active" ? false : status === "revoked" ? true : undefined;

  const admin = await getCurrentAdmin(token);
  let credentials: CredentialsResponse;

  try {
    credentials = await getCredentials(token, {
      studentId: studentId || undefined,
      studentName: studentName || undefined,
      revoked,
    });
  } catch (error) {
    if (isInstitutionSetupRequired(error)) {
      return (
        <InstitutionSetupState isSuperAdmin={admin.role === "OWNER" || admin.role === "SUPER_ADMIN"} />
      );
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      {/* â”€â”€ Page header with inline filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="pb-5 border-b border-[hsl(var(--border-default))]">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="kicker mb-2">Registry</p>
            <h1 className="page-title">Registry</h1>
            <p className="body-text mt-1">
              {credentials.total} record{credentials.total !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/dashboard/issue" className="btn-primary btn-sm mt-1">
            Issue credential
          </Link>
        </div>

        {/* Filter â€” part of the header, not a floating card */}
        <form className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1">
            <label htmlFor="studentName" className="field-label">
              Student name
            </label>
            <input
              id="studentName"
              name="studentName"
              defaultValue={studentName}
              placeholder="Name"
              className="field-shell w-full"
            />
          </div>
          <div className="min-w-35 flex-1">
            <label htmlFor="studentId" className="field-label">
              Student ID
            </label>
            <input
              id="studentId"
              name="studentId"
              defaultValue={studentId}
              placeholder="STU-2026-001"
              className="field-shell w-full font-mono"
            />
          </div>
          <div className="w-40">
            <label htmlFor="status" className="field-label">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              className="field-shell w-full"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="revoked">Revoked only</option>
            </select>
          </div>
          <button type="submit" className="btn-ghost">
            Apply filters
          </button>
          {(studentName || studentId || status !== "all") && (
            <Link
              href="/dashboard/credentials"
              className="btn-ghost text-[hsl(var(--text-tertiary))]"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* â”€â”€ Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="work-surface overflow-hidden p-0">
        {credentials.items.length === 0 ? (
          <div className="p-10">
            <EmptyState
              title="No matching credentials"
              description="Adjust the filters or issue a new credential."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="th-cell">Credential</th>
                  <th className="th-cell">Student</th>
                  <th className="th-cell">Issued</th>
                  <th className="th-cell">Checks</th>
                  <th className="th-cell">Status</th>
                  <th className="th-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {credentials.items.map((item) => (
                  <tr key={item.id}>
                    <td className="td-cell-sm" style={{ maxWidth: "14rem" }}>
                      <Link
                        href={`/dashboard/credentials/${item.id}`}
                        className="text-sm font-medium text-[hsl(var(--text-primary))] hover:text-[hsl(var(--text-secondary))] transition-colors block truncate"
                      >
                        {item.degree}
                      </Link>
                      <p className="meta-text font-mono truncate mt-0.5">
                        {item.verificationId}
                      </p>
                    </td>
                    <td className="td-cell-sm">
                      <p className="text-sm text-[hsl(var(--text-primary))]">
                        {item.studentName}
                      </p>
                      <p className="meta-text mt-0.5">{item.studentId}</p>
                    </td>
                    <td className="td-cell-sm whitespace-nowrap">
                      <p className="text-sm text-[hsl(var(--text-secondary))]">
                        {formatDate(item.issuedAt)}
                      </p>
                      <p className="meta-text mt-0.5">
                        {item.issuer.displayName ?? item.issuer.name}
                      </p>
                    </td>
                    <td className="td-cell-sm whitespace-nowrap">
                      <p className="text-sm text-[hsl(var(--text-secondary))]">
                        {item.verificationCount} check
                        {item.verificationCount !== 1 ? "s" : ""}
                      </p>
                      <p className="meta-text mt-0.5">
                        {item.verifiedAt
                          ? `Last ${formatDate(item.verifiedAt)}`
                          : "Never checked"}
                      </p>
                    </td>
                    <td className="td-cell-sm">
                      <div className="flex flex-col items-start gap-1.5">
                        <StatusBadge
                          status={item.revoked ? "REVOKED" : "VALID"}
                        />
                        <StatusBadge
                          status={
                            item.anchorStatus === "ANCHORED"
                              ? "ON_CHAIN_VERIFIED"
                              : item.anchorStatus
                          }
                        />
                      </div>
                    </td>
                    <td className="td-cell-sm">
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          href={`/dashboard/credentials/${item.id}`}
                          className="btn-ghost btn-sm"
                        >
                          Open
                        </Link>
                        {item.revoked ? (
                          <DeleteCredentialButton
                            credentialId={item.id}
                            summary={{
                              degree: item.degree,
                              studentName: item.studentName,
                              studentId: item.studentId,
                              issuerName:
                                item.issuer.displayName ?? item.issuer.name,
                            }}
                          />
                        ) : (
                          <RevokeCredentialButton
                            credentialId={item.id}
                            revoked={item.revoked}
                            summary={{
                              degree: item.degree,
                              studentName: item.studentName,
                              studentId: item.studentId,
                              issuerName:
                                item.issuer.displayName ?? item.issuer.name,
                            }}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

