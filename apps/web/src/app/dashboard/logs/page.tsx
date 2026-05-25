import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import { EmptyState } from "../../../components/empty-state";
import { InstitutionSetupState } from "../../../components/institution-setup-state";
import type { VerificationLogRecord } from "../../../lib/api";
import {
  getCurrentAdmin,
  getSessionToken,
  getVerificationLogs,
  isInstitutionSetupRequired,
} from "../../../lib/api";
import { formatDateTime } from "../../../lib/date-format";
import { getServerDictionary } from "../../../lib/i18n-server";

export default async function VerificationLogsPage() {
  const token = await getSessionToken();
  if (!token) return null;
  const t = await getServerDictionary();

  const admin = await getCurrentAdmin(token);
  let logs: VerificationLogRecord[];

  try {
    logs = await getVerificationLogs(token, 50);
  } catch (error) {
    if (isInstitutionSetupRequired(error)) {
      return (
        <InstitutionSetupState isSuperAdmin={admin.role === "OWNER" || admin.role === "SUPER_ADMIN"} />
      );
    }
    throw error;
  }

  const visibleLogs = logs.filter((log) => log.credential);
  const validCount = visibleLogs.filter((log) => log.status === "VALID").length;
  const revokedCount = visibleLogs.filter(
    (log) => log.status === "REVOKED",
  ).length;
  const invalidCount = visibleLogs.length - validCount - revokedCount;

  return (
    <div className="space-y-6">
      {/* Page header + metrics */}
      <div className="pb-6 border-b border-[hsl(var(--border-default))]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-6">
          <div>
            <p className="kicker mb-2">{t.dashboard.logs.title}</p>
            <h1 className="page-title">{t.dashboard.logs.title}</h1>
          </div>
          <Link
            href="/verify"
            target="_blank"
            className="btn-ghost btn-sm sm:mt-1 self-start"
          >
            {t.dashboard.logs.publicCheck}
            <ArrowSquareOut size={11} aria-hidden />
          </Link>
        </div>

        {/* Inline metric row */}
        <div className="flex flex-wrap gap-6 sm:gap-8">
          <Stat
            label={t.dashboard.logs.recentEvents}
            value={visibleLogs.length}
            note={t.dashboard.logs.credentialLinked}
          />
          <div className="hidden sm:block w-px self-stretch bg-[hsl(var(--border-default))]" />
          <Stat label={t.dashboard.logs.validResults} value={validCount} note={t.dashboard.logs.successful} />
          <div className="hidden sm:block w-px self-stretch bg-[hsl(var(--border-default))]" />
          <Stat
            label={t.dashboard.logs.exceptions}
            value={revokedCount + invalidCount}
            note={t.dashboard.logs.revokedOrInvalid}
          />
        </div>
      </div>

      {/* Table */}
      <div className="work-surface overflow-hidden p-0">
        {visibleLogs.length === 0 ? (
          <div className="p-10">
            <EmptyState
              title={t.dashboard.logs.emptyTitle}
              description={t.dashboard.logs.emptyDescription}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="th-cell">{t.common.checked}</th>
                  <th className="th-cell">{t.common.credential}</th>
                  <th className="th-cell">{t.common.institution}</th>
                  <th className="th-cell">{t.dashboard.logs.lookupType}</th>
                  <th className="th-cell">{t.dashboard.logs.ipAddress}</th>
                  <th className="th-cell">{t.common.status}</th>
                </tr>
              </thead>
              <tbody>
                {visibleLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="td-cell-sm whitespace-nowrap">
                      <p className="text-sm text-[hsl(var(--text-secondary))]">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </td>
                    <td className="td-cell-sm">
                      {log.credential ? (
                        <>
                          <Link
                            href={`/dashboard/credentials/${log.credential.id}`}
                            className="text-sm font-medium text-[hsl(var(--text-primary))] hover:text-[hsl(var(--text-secondary))] transition-colors"
                          >
                            {log.credential.degree}
                          </Link>
                          <p className="meta-text mt-0.5">
                            {log.credential.studentName}
                          </p>
                        </>
                      ) : (
                        <span className="meta-text">{t.common.unavailable}</span>
                      )}
                    </td>
                    <td className="td-cell-sm">
                      {log.credential?.issuer ? (
                        <>
                          <p className="text-sm text-[hsl(var(--text-secondary))]">
                            {log.credential.issuer.displayName ??
                              log.credential.issuer.name}
                          </p>
                          <p className="meta-text font-mono mt-0.5">
                            {log.credential.issuer.domain}
                          </p>
                        </>
                      ) : (
                        <span className="meta-text">{t.common.notAvailable}</span>
                      )}
                    </td>
                    <td className="td-cell-sm">
                      <p className="hash-text text-[hsl(var(--text-tertiary))]">
                        {log.uploadedHash
                          ? `${t.common.hashPrefix}: ${log.uploadedHash.slice(0, 14)}...`
                          : t.common.lookupId}
                      </p>
                    </td>
                    <td className="td-cell-sm">
                      <p className="hash-text text-[hsl(var(--text-tertiary))]">
                        {log.ipAddress ?? "-"}
                      </p>
                    </td>
                    <td className="td-cell-sm">
                      <LogStatusBadge status={log.status} t={t} />
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

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div>
      <p className="kicker mb-1.5">{label}</p>
      <p className="kpi-value">{value}</p>
      <p className="meta-text mt-1">{note}</p>
    </div>
  );
}

type LogStatus = "VALID" | "INVALID" | "REVOKED" | "NOT_FOUND" | "TAMPERED";

function LogStatusBadge({
  status,
  t,
}: {
  status: LogStatus;
  t: Awaited<ReturnType<typeof getServerDictionary>>;
}) {
  const map: Record<LogStatus, { label: string; cls: string }> = {
    VALID:      { label: t.dashboard.logs.statusVerified,      cls: "badge badge-valid" },
    REVOKED:    { label: t.dashboard.logs.statusRevoked,       cls: "badge badge-warn" },
    NOT_FOUND:  { label: t.dashboard.logs.statusNotRegistered, cls: "badge badge-neutral" },
    TAMPERED:   { label: t.dashboard.logs.statusModified,      cls: "badge badge-error" },
    INVALID:    { label: t.dashboard.logs.statusInvalid,       cls: "badge badge-error" },
  };
  const { label, cls } = map[status] ?? map.INVALID;
  return <span className={cls}>{label}</span>;
}
