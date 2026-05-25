"use client";

import Link from "next/link";
import { startTransition, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { BulkDeleteCredentialsModal } from "../../../components/bulk-delete-credentials-modal";
import { BulkRevokeCredentialsModal } from "../../../components/bulk-revoke-credentials-modal";
import { DeleteCredentialButton } from "../../../components/delete-credential-button";
import { EmptyState } from "../../../components/empty-state";
import { RevokeCredentialButton } from "../../../components/revoke-credential-button";
import { StatusBadge } from "../../../components/status-badge";
import type { AdminRole, CredentialsResponse } from "../../../lib/api";
import { formatDate } from "../../../lib/date-format";
import { useLanguage } from "../../../lib/i18n";

interface CredentialsTableProps {
  credentials: CredentialsResponse;
  role: AdminRole;
  yearFilter?: string;
}

function isSuperAdmin(role: AdminRole): boolean {
  return role === "SUPER_ADMIN" || role === "OWNER";
}

export function CredentialsTable({ credentials, role, yearFilter }: CredentialsTableProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"revoke" | "delete" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const superAdmin = isSuperAdmin(role);

  const filteredItems = yearFilter
    ? credentials.items.filter(
        (c) => new Date(c.issuedAt).getFullYear() === Number(yearFilter),
      )
    : credentials.items;

  const allIds = filteredItems.map((c) => c.id);
  const activeIds = filteredItems.filter((c) => !c.revoked).map((c) => c.id);
  const revokedIds = filteredItems.filter((c) => c.revoked).map((c) => c.id);

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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function handleBulkRevokeSuccess(result: { revoked: number; skipped: number; failed: number }) {
    setBulkAction(null);
    clearSelection();
    showToast(
      `${t.forms.bulkRevoke.successPrefix} ${result.revoked}, ${t.forms.bulkRevoke.successSkipped} ${result.skipped}, ${t.forms.bulkRevoke.successFailed} ${result.failed}.`,
    );
    startTransition(() => { router.refresh(); });
  }

  function handleBulkDeleteSuccess(result: { deleted: number; skipped: number; failed: number }) {
    setBulkAction(null);
    clearSelection();
    showToast(
      `${t.forms.bulkDeleteCredentials.successPrefix} ${result.deleted}, ${t.forms.bulkDeleteCredentials.successSkipped} ${result.skipped}, ${t.forms.bulkDeleteCredentials.successFailed} ${result.failed}.`,
    );
    startTransition(() => { router.refresh(); });
  }

  const selectedArr = Array.from(selected);
  const selectedActiveIds = selectedArr.filter((id) => activeIds.includes(id));
  const selectedRevokedIds = selectedArr.filter((id) => revokedIds.includes(id));

  if (filteredItems.length === 0) {
    return (
      <div className="work-surface overflow-hidden p-0">
        <div className="p-10">
          <EmptyState
            title={t.dashboard.registry.noMatchingTitle}
            description={t.dashboard.registry.noMatchingDescription}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Bulk action bar */}
      {superAdmin && selected.size > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 py-2.5 rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-xs">
          <span className="font-medium text-[hsl(var(--text-primary))]">
            {selected.size} {t.forms.bulkActions.selectedCount}
          </span>
          <div className="flex items-center gap-2">
            {selectedActiveIds.length > 0 && (
              <button
                type="button"
                onClick={() => setBulkAction("revoke")}
                className="inline-flex items-center rounded border border-[hsl(var(--status-warn-border))] bg-[hsl(var(--status-warn-bg))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--status-warn-text))] transition-colors hover:opacity-80 cursor-pointer"
              >
                {t.forms.bulkActions.bulkRevoke}
              </button>
            )}
            {selectedRevokedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setBulkAction("delete")}
                className="inline-flex items-center rounded border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--status-error-text))] transition-colors hover:opacity-80 cursor-pointer"
              >
                {t.forms.bulkActions.bulkDelete}
              </button>
            )}
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

      {/* Table */}
      <div className="work-surface overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {superAdmin && (
                  <th className="th-cell w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label={t.forms.bulkActions.selectAll}
                      className="h-3.5 w-3.5 rounded border-[hsl(var(--border-strong))] cursor-pointer accent-[hsl(var(--text-primary))]"
                    />
                  </th>
                )}
                <th className="th-cell">{t.dashboard.registry.columns.credential}</th>
                <th className="th-cell">{t.dashboard.registry.columns.student}</th>
                <th className="th-cell">{t.dashboard.registry.columns.issued}</th>
                <th className="th-cell">{t.dashboard.registry.columns.checks}</th>
                <th className="th-cell">{t.dashboard.registry.columns.status}</th>
                <th className="th-cell">{t.dashboard.registry.columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className={selected.has(item.id) ? "bg-[hsl(var(--bg-muted))]" : undefined}>
                  {superAdmin && (
                    <td className="td-cell-sm w-10">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleOne(item.id)}
                        aria-label={item.degree}
                        className="h-3.5 w-3.5 rounded border-[hsl(var(--border-strong))] cursor-pointer accent-[hsl(var(--text-primary))]"
                      />
                    </td>
                  )}
                  <td className="td-cell-sm" style={{ maxWidth: "14rem" }}>
                    <Link
                      href={`/dashboard/credentials/${item.id}`}
                      className="text-sm font-medium text-[hsl(var(--text-primary))] hover:text-[hsl(var(--text-secondary))] transition-colors block truncate"
                    >
                      {item.degree}
                    </Link>
                    <p className="meta-text font-mono truncate mt-0.5">
                      {item.credentialExternalId}
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
                      {item.verificationCount}{" "}
                      {item.verificationCount === 1
                        ? t.common.checksSingular
                        : t.common.checksPlural}
                    </p>
                    <p className="meta-text mt-0.5">
                      {item.verifiedAt
                        ? `${t.common.lastPrefix} ${formatDate(item.verifiedAt)}`
                        : t.common.neverChecked}
                    </p>
                  </td>
                  <td className="td-cell-sm">
                    <div className="flex flex-col items-start gap-1.5">
                      <StatusBadge status={item.revoked ? "REVOKED" : "VALID"} />
                      {!item.revoked && (
                        <StatusBadge
                          status={
                            item.anchorStatus === "ANCHORED"
                              ? "ON_CHAIN_VERIFIED"
                              : item.anchorStatus
                          }
                        />
                      )}
                    </div>
                  </td>
                  <td className="td-cell-sm">
                    <div className="flex flex-wrap gap-1.5">
                      <Link
                        href={`/dashboard/credentials/${item.id}`}
                        className="btn-ghost btn-sm"
                      >
                        {t.dashboard.registry.open}
                      </Link>
                      {/* Single-item actions: hidden for AUDITOR, shown for ADMIN and SUPER_ADMIN */}
                      {role !== "AUDITOR" && (
                        item.revoked ? (
                          superAdmin ? (
                            <DeleteCredentialButton
                              credentialId={item.id}
                              summary={{
                                degree: item.degree,
                                studentName: item.studentName,
                                studentId: item.studentId,
                                issuerName: item.issuer.displayName ?? item.issuer.name,
                              }}
                            />
                          ) : null
                        ) : (
                          superAdmin ? (
                            <RevokeCredentialButton
                              credentialId={item.id}
                              revoked={item.revoked}
                              summary={{
                                degree: item.degree,
                                studentName: item.studentName,
                                studentId: item.studentId,
                                issuerName: item.issuer.displayName ?? item.issuer.name,
                              }}
                            />
                          ) : null
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk revoke modal */}
      {bulkAction === "revoke" && selectedActiveIds.length > 0 && (
        <BulkRevokeCredentialsModal
          selectedIds={selectedActiveIds}
          onClose={() => setBulkAction(null)}
          onSuccess={handleBulkRevokeSuccess}
        />
      )}

      {/* Bulk delete modal */}
      {bulkAction === "delete" && selectedRevokedIds.length > 0 && (
        <BulkDeleteCredentialsModal
          selectedIds={selectedRevokedIds}
          onClose={() => setBulkAction(null)}
          onSuccess={handleBulkDeleteSuccess}
        />
      )}
    </>
  );
}
