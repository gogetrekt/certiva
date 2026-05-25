import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import { CreateDocumentProofForm } from "../../../components/create-document-proof-form";
import { DeleteDocumentProofButton } from "../../../components/delete-document-proof-button";
import { DisclosurePanel } from "../../../components/disclosure-panel";
import { EmptyState } from "../../../components/empty-state";
import { InstitutionSetupState } from "../../../components/institution-setup-state";
import { StatusBadge } from "../../../components/status-badge";
import {
  getCurrentAdmin,
  getDocumentProofs,
  getSessionToken,
  isInstitutionSetupRequired,
  type DocumentProofRecord,
} from "../../../lib/api";
import { formatDate, formatDateTime } from "../../../lib/date-format";
import { getServerDictionary } from "../../../lib/i18n-server";

export default async function DocumentProofPage() {
  const token = await getSessionToken();
  if (!token) return null;
  const t = await getServerDictionary();

  const admin = await getCurrentAdmin(token);
  let proofs: { total: number; items: DocumentProofRecord[] };

  try {
    proofs = await getDocumentProofs(token);
  } catch (error) {
    if (isInstitutionSetupRequired(error)) {
      return (
        <InstitutionSetupState isSuperAdmin={admin.role === "OWNER" || admin.role === "SUPER_ADMIN"} />
      );
    }
    throw error;
  }

  const hashOnlyCount = proofs.items.filter(
    (item) => item.anchorStatus === "HASH_ONLY",
  ).length;
  const totalChecks = proofs.items.reduce(
    (sum, item) => sum + item.verificationCount,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="pb-5 border-b border-[hsl(var(--border-default))]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="kicker mb-1.5">{t.dashboard.documentProofs.title}</p>
            <h1 className="page-title">{t.dashboard.documentProofs.title}</h1>
            <p className="body-text mt-1.5 max-w-lg">
              {t.dashboard.documentProofs.subtitle}
            </p>
          </div>
          <Link
            href="/verify/document"
            target="_blank"
            className="btn-ghost btn-sm mt-1 shrink-0"
          >
            {t.dashboard.documentProofs.publicCheck}
            <ArrowSquareOut size={11} aria-hidden />
          </Link>
        </div>
      </div>

      {/* Primary workflow: registration */}
      <div className="grid gap-6 xl:grid-cols-[480px_1fr]">
        {/* Left: registration form */}
        <div className="space-y-4">
          <div className="work-surface overflow-hidden p-0">
            <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
              <h2 className="section-title">{t.dashboard.documentProofs.registerHash}</h2>
              <p className="meta-text mt-0.5">
                {t.dashboard.documentProofs.registerDescription}
              </p>
            </div>
            <div className="px-5 py-5">
              <CreateDocumentProofForm />
            </div>
          </div>

          {/* Workflow notes */}
          <div className="space-y-1 px-1">
            {[
              {
                n: "01",
                text: t.dashboard.documentProofs.workflow[0],
              },
              {
                n: "02",
                text: t.dashboard.documentProofs.workflow[1],
              },
              {
                n: "03",
                text: t.dashboard.documentProofs.workflow[2],
              },
            ].map(({ n, text }) => (
              <div key={n} className="flex gap-3 py-2">
                <span className="mt-0.5 shrink-0 font-mono text-[0.625rem] font-semibold text-[hsl(var(--text-quaternary))] w-5">
                  {n}
                </span>
                <p className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: proof records */}
        <div>
          {/* Compact stats strip */}
          <div className="flex items-center gap-6 mb-4">
            <div>
              <span className="text-xl font-semibold tracking-tight text-[hsl(var(--text-primary))]">
                {proofs.total}
              </span>
              <span className="ml-1.5 text-xs text-[hsl(var(--text-tertiary))]">
                {t.dashboard.documentProofs.proofRecords}
              </span>
            </div>
            <div className="w-px h-4 bg-[hsl(var(--border-default))]" />
            <div>
              <span className="text-xl font-semibold tracking-tight text-[hsl(var(--text-primary))]">
                {hashOnlyCount}
              </span>
              <span className="ml-1.5 text-xs text-[hsl(var(--text-tertiary))]">
                {t.dashboard.documentProofs.hashOnly}
              </span>
            </div>
            <div className="w-px h-4 bg-[hsl(var(--border-default))]" />
            <div>
              <span className="text-xl font-semibold tracking-tight text-[hsl(var(--text-primary))]">
                {totalChecks}
              </span>
              <span className="ml-1.5 text-xs text-[hsl(var(--text-tertiary))]">
                {t.dashboard.documentProofs.publicChecks}
              </span>
            </div>
          </div>

          {/* Records list */}
          {proofs.items.length === 0 ? (
            <EmptyState
              title={t.dashboard.documentProofs.emptyTitle}
              description={t.dashboard.documentProofs.emptyDescription}
            />
          ) : (
            <div className="space-y-2">
              {proofs.items.map((proof) => (
                <div
                  key={proof.id}
                  className="work-surface overflow-hidden p-0"
                >
                  <DisclosurePanel
                    summary={
                      <div className="flex w-full items-center justify-between gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[hsl(var(--text-primary))]">
                            {proof.title}
                          </p>
                          <p className="meta-text mt-0.5">
                            {proof.referenceNumber ?? proof.documentType}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          <span className="hidden hash-text text-[hsl(var(--text-quaternary))] sm:block">
                            {proof.sourceHash.slice(0, 10)}...
                          </span>
                          <StatusBadge
                            status={proof.revoked ? "REVOKED" : "ACTIVE"}
                          />
                        </div>
                      </div>
                    }
                  >
                    <div className="border-t border-[hsl(var(--border-default))]">
                      <table className="w-full text-xs">
                        <tbody>
                          {[
                            {
                              label: t.dashboard.documentProofs.sha256Hash,
                              value: proof.sourceHash,
                              mono: true,
                            },
                            {
                              label: t.dashboard.documentProofs.documentProofId,
                              value: proof.verificationId,
                              mono: true,
                            },
                            {
                              label: t.dashboard.documentProofs.documentType,
                              value: proof.documentType ?? t.common.notSpecified,
                              mono: false,
                            },
                            {
                              label: t.dashboard.documentProofs.documentDate,
                              value: proof.documentDate
                                ? formatDate(proof.documentDate)
                                : t.common.notProvided,
                              mono: false,
                            },
                            {
                              label: t.dashboard.documentProofs.fileName,
                              value: proof.fileName,
                              mono: false,
                            },
                            {
                              label: t.dashboard.documentProofs.publicChecks,
                              value: String(proof.verificationCount),
                              mono: false,
                            },
                            {
                              label: t.dashboard.documentProofs.lastChecked,
                              value: proof.verifiedAt
                                ? formatDateTime(proof.verifiedAt)
                                : t.common.neverChecked,
                              mono: false,
                            },
                            {
                              label: t.dashboard.documentProofs.registered,
                              value: formatDateTime(proof.createdAt),
                              mono: false,
                            },
                          ].map((row, i) => (
                            <tr
                              key={row.label}
                              className={
                                i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""
                              }
                            >
                              <td className="w-28 shrink-0 px-5 py-2 text-[hsl(var(--text-tertiary))]">
                                {row.label}
                              </td>
                              <td
                                className={`px-5 py-2 text-[hsl(var(--text-secondary))] ${row.mono ? "font-mono wrap-break-word leading-5" : ""}`}
                              >
                                {row.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex flex-wrap gap-2 px-5 py-3 border-t border-[hsl(var(--border-subtle))]">
                        <Link
                          href={proof.proofUrl}
                          className="btn-ghost btn-sm"
                        >
                          {t.common.view}
                        </Link>
                        <DeleteDocumentProofButton
                          proofId={proof.id}
                          summary={{
                            title: proof.title,
                            referenceNumber: proof.referenceNumber,
                          }}
                        />
                        <a
                          href={proof.metadataUri}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost btn-sm"
                        >
                          {t.common.metadata}
                          <ArrowSquareOut size={10} aria-hidden />
                        </a>
                      </div>
                    </div>
                  </DisclosurePanel>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
