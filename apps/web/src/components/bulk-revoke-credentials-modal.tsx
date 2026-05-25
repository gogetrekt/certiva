"use client";

import { useEffect, useId, useState } from "react";

import { useLanguage } from "../lib/i18n";

type RevocationReason =
  | "DATA_CORRECTION"
  | "ISSUED_IN_ERROR"
  | "FRAUD_SUSPECTED"
  | "INSTITUTION_REQUEST"
  | "OTHER";

interface BulkRevokeCredentialsModalProps {
  selectedIds: string[];
  onClose: () => void;
  onSuccess: (result: { revoked: number; skipped: number; failed: number }) => void;
}

export function BulkRevokeCredentialsModal({
  selectedIds,
  onClose,
  onSuccess,
}: BulkRevokeCredentialsModalProps) {
  const { t } = useLanguage();
  const titleId = useId();
  const descriptionId = useId();
  const reasonId = useId();
  const notesId = useId();
  const [reason, setReason] = useState<RevocationReason | "">("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function handleSubmit() {
    if (!reason) {
      setError(t.forms.bulkRevoke.reasonRequired);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/credentials/bulk-revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, reason, notes: notes.trim() || undefined }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? t.forms.bulkRevoke.unable);
      }
      const result = (await response.json()) as { revoked: number; skipped: number; failed: number };
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.forms.bulkRevoke.unable);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-[hsl(var(--bg-canvas))]/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] shadow-2xl"
      >
        <div className="border-b border-[hsl(var(--border-default))] px-6 py-5">
          <p id={titleId} className="text-sm font-semibold text-[hsl(var(--text-primary))]">
            {t.forms.bulkRevoke.title}
          </p>
          <p id={descriptionId} className="mt-0.5 text-xs text-[hsl(var(--text-tertiary))]">
            {t.forms.bulkRevoke.description}
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-4 py-3">
            <p className="kicker mb-1">
              {selectedIds.length} {t.forms.bulkRevoke.selectedCount}
            </p>
            <p className="text-xs text-[hsl(var(--text-tertiary))]">
              {t.forms.bulkRevoke.activeOnly}
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={reasonId} className="field-label">
              {t.forms.bulkRevoke.reasonLabel}{" "}
              <span className="text-[hsl(var(--status-error-text))]">*</span>
            </label>
            <select
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value as RevocationReason | "")}
              className="field-shell w-full"
              required
            >
              <option value="">{t.forms.bulkRevoke.selectReason}</option>
              {(Object.keys(t.forms.revokeCredential.reasons) as RevocationReason[]).map((key) => (
                <option key={key} value={key}>
                  {t.forms.revokeCredential.reasons[key]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={notesId} className="field-label">
              {t.forms.bulkRevoke.notes}{" "}
              <span className="text-[hsl(var(--text-quaternary))] font-normal">
                ({t.common.optional})
              </span>
            </label>
            <textarea
              id={notesId}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={t.forms.bulkRevoke.notesPlaceholder}
              className="field-shell w-full resize-none"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-4 py-3 text-xs text-[hsl(var(--status-error-text))]">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[hsl(var(--border-default))] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost btn-sm"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason}
            className="inline-flex items-center rounded border border-[hsl(var(--status-warn-border))] bg-[hsl(var(--status-warn-bg))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--status-warn-text))] transition-colors hover:opacity-80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? t.forms.bulkRevoke.revoking : t.forms.bulkRevoke.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
