import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import type { LatestIssuanceRecord, LatestRevocationRecord } from "../../../../lib/api";
import { StatusBadge } from "../../../../components/status-badge";
import { formatDate } from "../../../../lib/date-format";
import { getServerDictionary } from "../../../../lib/i18n-server";

// --- Latest issuances ---------------------------------------------------------

export async function IssuanceTable({ items }: { items: LatestIssuanceRecord[] }) {
  const t = await getServerDictionary();

  return (
    <div className="work-surface overflow-hidden p-0">
      <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
        <p className="kicker mb-1">{t.auditComponents.issuanceTable.recent}</p>
        <h2 className="section-title">{t.auditComponents.issuanceTable.latestIssuances}</h2>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="body-text">{t.auditComponents.issuanceTable.emptyIssuances}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="th-cell">{t.auditComponents.issuanceTable.credentialId}</th>
                <th className="th-cell">{t.auditComponents.issuanceTable.institution}</th>
                <th className="th-cell">{t.auditComponents.issuanceTable.degree}</th>
                <th className="th-cell">{t.auditComponents.issuanceTable.issued}</th>
                <th className="th-cell">{t.auditComponents.issuanceTable.chain}</th>
                <th className="th-cell">{t.auditComponents.issuanceTable.txHash}</th>
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
                        {item.txHash.slice(0, 8)}...{item.txHash.slice(-6)}
                        <ArrowSquareOut size={10} aria-hidden />
                      </a>
                    ) : (
                      <span className="meta-text text-[hsl(var(--text-quaternary))]">-</span>
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

// --- Latest revocations -------------------------------------------------------

export async function RevocationTable({ items }: { items: LatestRevocationRecord[] }) {
  const t = await getServerDictionary();

  return (
    <div className="work-surface overflow-hidden p-0">
      <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
        <p className="kicker mb-1">{t.auditComponents.issuanceTable.recent}</p>
        <h2 className="section-title">{t.auditComponents.issuanceTable.latestRevocations}</h2>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="body-text text-[hsl(var(--text-tertiary))]">{t.auditComponents.issuanceTable.emptyRevocations}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="th-cell">{t.auditComponents.issuanceTable.credentialId}</th>
                <th className="th-cell">{t.auditComponents.issuanceTable.institution}</th>
                <th className="th-cell">{t.auditComponents.issuanceTable.degree}</th>
                <th className="th-cell">{t.auditComponents.issuanceTable.revoked}</th>
                <th className="th-cell">{t.auditComponents.issuanceTable.reason}</th>
                <th className="th-cell">{t.auditComponents.issuanceTable.revocationTx}</th>
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
                      {item.revokedAt ? formatDate(item.revokedAt) : "-"}
                    </p>
                  </td>
                  <td className="td-cell-sm max-w-[140px]">
                    <p
                      className="text-sm text-[hsl(var(--text-secondary))] truncate"
                      title={item.revocationReason ?? undefined}
                    >
                      {item.revocationReason ?? "-"}
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
                        {item.revocationTxHash.slice(0, 8)}...{item.revocationTxHash.slice(-6)}
                        <ArrowSquareOut size={10} aria-hidden />
                      </a>
                    ) : (
                      <span className="meta-text text-[hsl(var(--text-quaternary))]">-</span>
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
