import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import { EmptyState } from "../../../components/empty-state";
import { InstitutionSetupState } from "../../../components/institution-setup-state";
import { StatusBadge } from "../../../components/status-badge";
import type { VerificationLogRecord } from "../../../lib/api";
import {
  getCurrentAdmin,
  getSessionToken,
  getVerificationLogs,
  isInstitutionSetupRequired,
} from "../../../lib/api";
import { formatDateTime } from "../../../lib/date-format";

export default async function VerificationLogsPage() {
  const token = await getSessionToken();
  if (!token) return null;

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
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="kicker mb-2">Verification Logs</p>
            <h1 className="page-title">Verification Logs</h1>
          </div>
          <Link
            href="/verify"
            target="_blank"
            className="btn-ghost btn-sm mt-1"
          >
            Public check
            <ArrowSquareOut size={11} aria-hidden />
          </Link>
        </div>

        {/* Inline metric row */}
        <div className="flex flex-wrap gap-8">
          <Stat
            label="Recent events"
            value={visibleLogs.length}
            note="Credential-linked"
          />
          <div className="w-px self-stretch bg-[hsl(var(--border-default))]" />
          <Stat label="Valid results" value={validCount} note="Successful" />
          <div className="w-px self-stretch bg-[hsl(var(--border-default))]" />
          <Stat
            label="Exceptions"
            value={revokedCount + invalidCount}
            note="Revoked or invalid"
          />
        </div>
      </div>

      {/* Table */}
      <div className="work-surface overflow-hidden p-0">
        {visibleLogs.length === 0 ? (
          <div className="p-10">
            <EmptyState
              title="No verification logs yet"
              description="Activity will appear here when relying parties verify credentials."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="th-cell">Checked</th>
                  <th className="th-cell">Credential</th>
                  <th className="th-cell">Institution</th>
                  <th className="th-cell">Lookup type</th>
                  <th className="th-cell">IP address</th>
                  <th className="th-cell">Result</th>
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
                        <span className="meta-text">Unavailable</span>
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
                        <span className="meta-text">Not available</span>
                      )}
                    </td>
                    <td className="td-cell-sm">
                      <p className="hash-text text-[hsl(var(--text-tertiary))]">
                        {log.uploadedHash
                          ? `Hash: ${log.uploadedHash.slice(0, 14)}...`
                          : "ID lookup"}
                      </p>
                    </td>
                    <td className="td-cell-sm">
                      <p className="hash-text text-[hsl(var(--text-tertiary))]">
                        {log.ipAddress ?? "-"}
                      </p>
                    </td>
                    <td className="td-cell-sm">
                      <StatusBadge status={log.status} />
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
