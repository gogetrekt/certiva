"use client";

import { useEffect, useId, useState } from "react";

import { useLanguage } from "../lib/i18n";

interface BulkDeleteCredentialsModalProps {
  selectedIds: string[];
  onClose: () => void;
  onSuccess: (result: { deleted: number; skipped: number; failed: number }) => void;
}

export function BulkDeleteCredentialsModal({
  selectedIds,
  onClose,
  onSuccess,
}: BulkDeleteCredentialsModalProps) {
  const { t } = useLanguage();
  const titleId = useId();
  const descriptionId = useId();
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
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/credentials/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? t.forms.bulkDeleteCredentials.unable);
      }
      const result = (await response.json()) as { deleted: number; skipped: number; failed: number };
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.forms.bulkDeleteCredentials.unable);
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
            {t.forms.bulkDeleteCredentials.title}
          </p>
          <p id={descriptionId} className="mt-0.5 text-xs text-[hsl(var(--text-tertiary))]">
            {t.forms.bulkDeleteCredentials.description}
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-4 py-3">
            <p className="kicker mb-1">
              {selectedIds.length} {t.forms.bulkDeleteCredentials.selectedCount}
            </p>
            <p className="text-xs text-[hsl(var(--text-tertiary))]">
              {t.forms.bulkDeleteCredentials.revokedOnly}
            </p>
          </div>

          <div className="rounded-lg border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-4 py-3 text-xs leading-5 text-[hsl(var(--status-error-text))]">
            {t.forms.bulkDeleteCredentials.warning}
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
            disabled={isSubmitting}
            className="inline-flex items-center rounded border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--status-error-text))] transition-colors hover:opacity-80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? t.forms.bulkDeleteCredentials.deleting : t.forms.bulkDeleteCredentials.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
