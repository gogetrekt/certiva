import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import { EmptyState } from "../../../components/empty-state";
import { InstitutionSetupState } from "../../../components/institution-setup-state";
import { StatusBadge } from "../../../components/status-badge";
import {
  getBlockchainAudit,
  getCurrentAdmin,
  getSessionToken,
  isInstitutionSetupRequired,
  type BlockchainAuditRecord,
} from "../../../lib/api";
import { formatDateTime } from "../../../lib/date-format";
import { getServerDictionary } from "../../../lib/i18n-server";

const POLYGON_AMOY_EXPLORER_URL = "https://amoy.polygonscan.com";

export default async function BlockchainAuditPage() {
  const token = await getSessionToken();
  if (!token) return null;
  const t = await getServerDictionary();

  const admin = await getCurrentAdmin(token);
  let entries: BlockchainAuditRecord[];

  try {
    entries = await getBlockchainAudit(token, 100);
  } catch (error) {
    if (isInstitutionSetupRequired(error)) {
      return (
        <InstitutionSetupState isSuperAdmin={admin.role === "OWNER" || admin.role === "SUPER_ADMIN"} />
      );
    }
    throw error;
  }

  const issuanceCount = entries.filter(
    (e) => e.operation === "ISSUANCE",
  ).length;
  const revocationCount = entries.filter(
    (e) => e.operation === "REVOCATION",
  ).length;
  const confirmedCount = entries.filter((e) => e.status === "ANCHORED").length;

  return (
    <div className="space-y-6">
      {/* â”€â”€ Page header + inline metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="pb-6 border-b border-[hsl(var(--border-default))]">
        <div className="mb-6">
          <p className="kicker mb-2">{t.dashboard.blockchain.title}</p>
          <h1 className="page-title">{t.dashboard.blockchain.title}</h1>
          <p className="body-text mt-2">
            {t.dashboard.blockchain.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-8">
          <Stat
            label={t.dashboard.blockchain.auditEvents}
            value={entries.length}
            note={t.dashboard.blockchain.lifecycleEntries}
          />
          <div className="w-px self-stretch bg-[hsl(var(--border-default))]" />
          <Stat
            label={t.dashboard.blockchain.confirmedWrites}
            value={confirmedCount}
            note={t.dashboard.blockchain.anchoredOperations}
          />
          <div className="w-px self-stretch bg-[hsl(var(--border-default))]" />
          <Stat
            label={t.dashboard.blockchain.issuances}
            value={issuanceCount}
            note={`${revocationCount} ${t.dashboard.blockchain.revocations}`}
          />
        </div>
      </div>

      {/* â”€â”€ Audit records â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {entries.length === 0 ? (
        <div className="work-surface p-10">
          <EmptyState
            title={t.dashboard.blockchain.emptyTitle}
            description={t.dashboard.blockchain.emptyDescription}
          />
        </div>
      ) : (
        <div className="work-surface overflow-hidden p-0">
          <div className="divide-y divide-[hsl(var(--border-subtle))]">
            {entries.map((entry) => {
              const transactionHash =
                entry.operation === "REVOCATION"
                  ? (entry.txHash ?? entry.credential.revocationTxHash)
                  : (entry.txHash ?? entry.credential.txHash);

              return (
                <div key={entry.id} className="px-6 py-5">
                  {/* Entry header row */}
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={entry.status} />
                      <span className="role-chip uppercase">
                        {formatOperationLabel(entry.operation, t)}
                      </span>
                      <span className="text-sm font-medium text-[hsl(var(--text-primary))] truncate">
                        {entry.credential.degree}
                      </span>
                    </div>
                    <p className="meta-text shrink-0">
                      {formatDateTime(entry.updatedAt)}
                    </p>
                  </div>
                  <p className="meta-text mb-4">
                    {entry.credential.studentName} /{" "}
                    {entry.credential.issuer.displayName ??
                      entry.credential.issuer.name}
                  </p>

                  {/* Detail grid â€” horizontal pairs, not a full table */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 mb-4">
                    {[
                      {
                        label: t.dashboard.blockchain.credentialId,
                        value: entry.credential.id,
                        mono: true,
                      },
                      {
                        label: t.dashboard.blockchain.block,
                        value: entry.blockNumber
                          ? String(entry.blockNumber)
                          : t.common.pending,
                        mono: false,
                      },
                      {
                        label: t.dashboard.blockchain.chainStatus,
                        value: entry.credential.chainStatus,
                        mono: false,
                      },
                      {
                        label: t.dashboard.blockchain.revocation,
                        value: entry.credential.revokedAt
                          ? t.common.revoked
                          : t.common.active,
                        mono: false,
                      },
                    ].map((row) => (
                      <div key={row.label}>
                        <p className="kicker mb-1">{row.label}</p>
                        <p
                          className={`text-xs text-[hsl(var(--text-secondary))] ${row.mono ? "font-mono break-all" : ""}`}
                        >
                          {row.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Transaction hash */}
                  {transactionHash && (
                    <div className="mb-4 p-3 rounded-lg bg-[hsl(var(--bg-subtle))] border border-[hsl(var(--border-default))]">
                      <p className="kicker mb-1.5">{t.dashboard.blockchain.transactionHash}</p>
                      <p className="hash-text text-[hsl(var(--text-secondary))]">
                        {transactionHash}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/credentials/${entry.credential.id}`}
                      className="btn-ghost btn-sm"
                    >
                      {t.dashboard.blockchain.openCredential}
                    </Link>
                    {transactionHash && (
                      <a
                        href={`${POLYGON_AMOY_EXPLORER_URL}/tx/${transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost btn-sm"
                      >
                        {t.dashboard.blockchain.viewOnPolygonscan}
                        <ArrowSquareOut size={11} aria-hidden />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatOperationLabel(
  operation: BlockchainAuditRecord["operation"],
  t: Awaited<ReturnType<typeof getServerDictionary>>,
) {
  return operation === "REVOCATION"
    ? t.dashboard.blockchain.operationRevocation
    : t.dashboard.blockchain.operationIssuance;
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

