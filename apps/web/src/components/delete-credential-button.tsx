"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useId, useState } from "react";

import { useLanguage } from "../lib/i18n";

type CredentialSummary = {
  studentName: string;
  studentId: string;
  degree: string;
  issuerName?: string;
};

export function DeleteCredentialButton({
  credentialId,
  redirectTo,
  summary,
}: {
  credentialId: string;
  redirectTo?: string;
  summary: CredentialSummary;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const titleId = useId();
  const descriptionId = useId();
  const warningId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  async function handleDelete() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/credentials/${credentialId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? t.forms.deleteCredential.unable);
      }
      setIsOpen(false);
      startTransition(() => {
        if (redirectTo) { router.push(redirectTo); return; }
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.forms.deleteCredential.unable);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center rounded border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--status-error-text))] transition-colors hover:opacity-80 cursor-pointer"
      >
        {t.forms.deleteCredential.delete}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-[hsl(var(--bg-canvas))]/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={`${descriptionId} ${warningId}`}
            className="relative w-full max-w-md rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] shadow-2xl"
          >
            <div className="border-b border-[hsl(var(--border-default))] px-6 py-5">
              <p id={titleId} className="text-sm font-semibold text-[hsl(var(--text-primary))]">{t.forms.deleteCredential.title}</p>
              <p id={descriptionId} className="mt-0.5 text-xs text-[hsl(var(--text-tertiary))]">
                {t.forms.deleteCredential.description}
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-4 py-3">
                <p className="kicker mb-1.5">{t.forms.deleteCredential.credential}</p>
                <p className="text-sm font-medium text-[hsl(var(--text-primary))]">{summary.degree}</p>
                <p className="text-xs text-[hsl(var(--text-tertiary))]">{summary.studentName} / {summary.studentId}</p>
                {summary.issuerName ? <p className="text-xs text-[hsl(var(--text-quaternary))]">{summary.issuerName}</p> : null}
              </div>
              <div
                id={warningId}
                className="rounded-lg border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-4 py-3 text-xs leading-5 text-[hsl(var(--status-error-text))]"
              >
                {t.forms.deleteCredential.warning}
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
                onClick={() => setIsOpen(false)}
                className="btn-ghost btn-sm"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="inline-flex items-center rounded border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--status-error-text))] transition-colors hover:opacity-80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? t.forms.deleteCredential.deleting : t.forms.deleteCredential.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
