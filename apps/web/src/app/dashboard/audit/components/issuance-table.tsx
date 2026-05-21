import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import type { LatestIssuanceRecord, LatestRevocationRecord } from "../../../../lib/api";
import { StatusBadge } from "../../../../components/status-badge";
import { formatDate } from "../../../../lib/date-format";

// ─── Latest issuances ─────────────────────────────────────────────────────────

export function IssuanceTable({ items }: { items: LatestIssuanceRecord[] }) {
  return (
    <div className="work-surface overflow-hidden p-0">
      <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
        <p className="kicker mb-1">Recent</p>
        <h2 className="section-title">Latest Issuances</h2>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="body-text">No credentials issued yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="th-cell">Credential ID</th>
                <th className="th-cell">Institution</th>
                <th className="th-cell">Degree</th>
                <th className="th-cell">Issued</th>
                <th className="th-cell">Chain</th>
                <th className="th-cell">Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="td-cell-sm max-w-[160px]">
                    <Link
                      href={`/dashboard/credentials/${item.id}`}
                      className="hash-text text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] transition-colors block truncate"
                      title={item.credentialExternalId}
                    >
                      {item.credentialExternalId}
                    </Link>
                  </td>
                  <td className="td-cell-sm">
                    <p className="text-sm text-[hsl(var(--text-primary))]">
                      {item.issuer.displayName ?? item.issuer.name}
                    </p>
                  </td>
                  <td className="td-cell-sm max-w-[160px]">
                    <p className="text-sm text-[hsl(var(--text-secondary))] truncate">{item.degree}</p>
                    <p className="meta-text mt-0.5">{item.studentName}</p>
                  </td>
                  <td className="td-cell-sm whitespace-nowrap">
                    <p className="text-sm text-[hsl(var(--text-secondary))]">
                      {formatDate(item.issuedAt)}
                    </p>
                  </td>
                  <td className="td-cell-sm">
                    <StatusBadge
                      status={
                        item.anchorStatus === "ANCHORED"
                          ? "ON_CHAIN_VERIFIED"
                          : item.anchorStatus === "FAILED"
                            ? "FAILED"
                            : "PENDING"
                      }
                    />
                  </td>
                  <td className="td-cell-sm max-w-[120px]">
                    {item.txHash ? (
                      <a
                        href={`https://amoy.polygonscan.com/tx/${item.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hash-text text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] transition-colors truncate"
                        title={item.txHash}
                      >
                        {item.txHash.slice(0, 8)}…{item.txHash.slice(-6)}
                        <ArrowSquareOut size={10} aria-hidden />
                      </a>
                    ) : (
                      <span className="meta-text text-[hsl(var(--text-quaternary))]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Latest revocations ───────────────────────────────────────────────────────

export function RevocationTable({ items }: { items: LatestRevocationRecord[] }) {
  return (
    <div className="work-surface overflow-hidden p-0">
      <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
        <p className="kicker mb-1">Recent</p>
        <h2 className="section-title">Latest Revocations</h2>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="body-text text-[hsl(var(--text-tertiary))]">No revocations recorded.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="th-cell">Credential ID</th>
                <th className="th-cell">Institution</th>
                <th className="th-cell">Degree</th>
                <th className="th-cell">Revoked</th>
                <th className="th-cell">Reason</th>
                <th className="th-cell">Revocation Tx</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="td-cell-sm max-w-[160px]">
                    <Link
                      href={`/dashboard/credentials/${item.id}`}
                      className="hash-text text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] transition-colors block truncate"
                      title={item.credentialExternalId}
                    >
                      {item.credentialExternalId}
                    </Link>
                  </td>
                  <td className="td-cell-sm">
                    <p className="text-sm text-[hsl(var(--text-primary))]">
                      {item.issuer.displayName ?? item.issuer.name}
                    </p>
                  </td>
                  <td className="td-cell-sm max-w-[160px]">
                    <p className="text-sm text-[hsl(var(--text-secondary))] truncate">{item.degree}</p>
                    <p className="meta-text mt-0.5">{item.studentName}</p>
                  </td>
                  <td className="td-cell-sm whitespace-nowrap">
                    <p className="text-sm text-[hsl(var(--status-error-text))]">
                      {item.revokedAt ? formatDate(item.revokedAt) : "—"}
                    </p>
                  </td>
                  <td className="td-cell-sm max-w-[140px]">
                    <p
                      className="text-sm text-[hsl(var(--text-secondary))] truncate"
                      title={item.revocationReason ?? undefined}
                    >
                      {item.revocationReason ?? "—"}
                    </p>
                  </td>
                  <td className="td-cell-sm max-w-[120px]">
                    {item.revocationTxHash ? (
                      <a
                        href={`https://amoy.polygonscan.com/tx/${item.revocationTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hash-text text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] transition-colors truncate"
                        title={item.revocationTxHash}
                      >
                        {item.revocationTxHash.slice(0, 8)}…{item.revocationTxHash.slice(-6)}
                        <ArrowSquareOut size={10} aria-hidden />
                      </a>
                    ) : (
                      <span className="meta-text text-[hsl(var(--text-quaternary))]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="work-surface overflow-hidden p-0">
      <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
        <div className="skeleton h-2.5 w-14 rounded mb-2" />
        <div className="skeleton h-4 w-36 rounded" />
      </div>
      <div className="divide-y divide-[hsl(var(--border-subtle))]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-6">
            <div className="skeleton h-3 w-28 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
