"use client";

import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { startTransition, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { BulkDeleteDocumentProofsModal } from "../../../components/bulk-delete-document-proofs-modal";
import { DeleteDocumentProofButton } from "../../../components/delete-document-proof-button";
import { DisclosurePanel } from "../../../components/disclosure-panel";
import { EmptyState } from "../../../components/empty-state";
import { StatusBadge } from "../../../components/status-badge";
import type { AdminRole, DocumentProofRecord } from "../../../lib/api";
import { formatDate, formatDateTime } from "../../../lib/date-format";
import { useLanguage } from "../../../lib/i18n";

interface DocumentProofsListProps {
  proofs: { total: number; items: DocumentProofRecord[] };
  role: AdminRole;
}

function isSuperAdmin(role: AdminRole): boolean {
  return role === "SUPER_ADMIN" || role === "OWNER";
}

export function DocumentProofsList({ proofs, role }: DocumentProofsListProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const superAdmin = isSuperAdmin(role);
  const allIds = proofs.items.map((p) => p.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function handleBulkDeleteSuccess(result: { deleted: number; skipped: number; failed: number }) {
    setShowBulkDelete(false);
    clearSelection();
    showToast(
      `${t.forms.bulkDeleteDocumentProofs.successPrefix} ${result.deleted}, ${t.forms.bulkDeleteDocumentProofs.successSkipped} ${result.skipped}, ${t.forms.bulkDeleteDocumentProofs.successFailed} ${result.failed}.`,
    );
    startTransition(() => { router.refresh(); });
  }

  if (proofs.items.length === 0) {
    return (
      <EmptyState
        title={t.dashboard.documentProofs.emptyTitle}
        description={t.dashboard.documentProofs.emptyDescription}
      />
    );
  }

  const selectedArr = Array.from(selected);

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {superAdmin && selected.size > 0 && (
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-xs">
          <span className="font-medium text-[hsl(var(--text-primary))]">
            {selected.size} {t.forms.bulkActions.selectedCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBulkDelete(true)}
              className="inline-flex items-center rounded border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--status-error-text))] transition-colors hover:opacity-80 cursor-pointer"
            >
              {t.forms.bulkActions.bulkDelete}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="btn-ghost btn-sm"
            >
              {t.forms.bulkActions.clearSelection}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast ? (
        <div className="rounded-lg border border-[hsl(var(--status-valid-border))] bg-[hsl(var(--status-valid-bg))] px-4 py-2.5 text-xs text-[hsl(var(--status-valid-text))]">
          {toast}
        </div>
      ) : null}

      {/* Select all row (only for Super Admin) */}
      {superAdmin && proofs.items.length > 1 && (
        <div className="flex items-center gap-2 px-1 pb-0.5">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            aria-label={t.forms.bulkActions.selectAll}
            className="h-3.5 w-3.5 rounded border-[hsl(var(--border-strong))] cursor-pointer accent-[hsl(var(--text-primary))]"
          />
          <span className="text-xs text-[hsl(var(--text-tertiary))]">
            {t.forms.bulkActions.selectAll}
          </span>
        </div>
      )}

      {/* Records */}
      {proofs.items.map((proof) => (
        <div
          key={proof.id}
          className={`work-surface overflow-hidden p-0 ${selected.has(proof.id) ? "ring-1 ring-[hsl(var(--border-strong))]" : ""}`}
        >
          <DisclosurePanel
            summary={
              <div className="flex w-full items-center justify-between gap-3 min-w-0">
                {superAdmin && (
                  <input
                    type="checkbox"
                    checked={selected.has(proof.id)}
                    onChange={(e) => { e.stopPropagation(); toggleOne(proof.id); }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={proof.title}
                    className="h-3.5 w-3.5 rounded border-[hsl(var(--border-strong))] cursor-pointer accent-[hsl(var(--text-primary))] shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
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
                  <StatusBadge status={proof.revoked ? "REVOKED" : "ACTIVE"} />
                </div>
              </div>
            }
          >
                <div className="border-t border-[hsl(var(--border-default))]">
                  <table className="w-full text-xs">
                    <tbody>
                      {[
                        { label: t.dashboard.documentProofs.sha256Hash, value: proof.sourceHash, mono: true },
                        { label: t.dashboard.documentProofs.documentProofId, value: proof.verificationId, mono: true },
                        { label: t.dashboard.documentProofs.documentType, value: proof.documentType ?? t.common.notSpecified, mono: false },
                        { label: t.dashboard.documentProofs.documentDate, value: proof.documentDate ? formatDate(proof.documentDate) : t.common.notProvided, mono: false },
                        { label: t.dashboard.documentProofs.fileName, value: proof.fileName, mono: false },
                        { label: t.dashboard.documentProofs.publicChecks, value: String(proof.verificationCount), mono: false },
                        { label: t.dashboard.documentProofs.lastChecked, value: proof.verifiedAt ? formatDateTime(proof.verifiedAt) : t.common.neverChecked, mono: false },
                        { label: t.dashboard.documentProofs.registered, value: formatDateTime(proof.createdAt), mono: false },
                      ].map((row, i) => (
                        <tr key={row.label} className={i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""}>
                          <td className="w-28 shrink-0 px-5 py-2 text-[hsl(var(--text-tertiary))]">
                            {row.label}
                          </td>
                          <td className={`px-5 py-2 text-[hsl(var(--text-secondary))] ${row.mono ? "font-mono wrap-break-word leading-5" : ""}`}>
                            {row.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex flex-wrap gap-2 px-5 py-3 border-t border-[hsl(var(--border-subtle))]">
                    <Link href={proof.proofUrl} className="btn-ghost btn-sm">
                      {t.common.view}
                    </Link>
                    {/* Delete only shown to Super Admin */}
                    {superAdmin && (
                      <DeleteDocumentProofButton
                        proofId={proof.id}
                        summary={{
                          title: proof.title,
                          referenceNumber: proof.referenceNumber,
                        }}
                      />
                    )}
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

      {/* Bulk delete modal */}
      {showBulkDelete && selectedArr.length > 0 && (
        <BulkDeleteDocumentProofsModal
          selectedIds={selectedArr}
          onClose={() => setShowBulkDelete(false)}
          onSuccess={handleBulkDeleteSuccess}
        />
      )}
    </div>
  );
}
