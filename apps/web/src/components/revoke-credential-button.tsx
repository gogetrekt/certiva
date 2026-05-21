"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useId, useState } from "react";

type RevocationReason =
  | "DATA_CORRECTION"
  | "ISSUED_IN_ERROR"
  | "FRAUD_SUSPECTED"
  | "INSTITUTION_REQUEST"
  | "OTHER";

const REVOCATION_REASON_LABELS: Record<RevocationReason, string> = {
  DATA_CORRECTION: "Data correction",
  ISSUED_IN_ERROR: "Issued in error",
  FRAUD_SUSPECTED: "Fraud suspected",
  INSTITUTION_REQUEST: "Institution request",
  OTHER: "Other",
};

type CredentialSummary = {
  studentName: string;
  studentId: string;
  degree: string;
  issuerName?: string;
};

export function RevokeCredentialButton({
  credentialId,
  revoked,
  summary,
}: {
  credentialId: string;
  revoked: boolean;
  summary: CredentialSummary;
}) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const reasonId = useId();
  const notesId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<RevocationReason | "">("");
  const [notes, setNotes] = useState("");
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

  async function handleRevoke() {
    if (!reason) {
      setError("A revocation reason is required");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/credentials/${credentialId}/revoke`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, notes: notes.trim() || undefined }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "Unable to revoke credential");
      }
      setIsOpen(false);
      setReason("");
      setNotes("");
      startTransition(() => { router.refresh(); });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to revoke credential");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (revoked) {
    return (
      <span className="badge badge-warn">Revoked</span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center rounded border border-[hsl(var(--status-warn-border))] bg-[hsl(var(--status-warn-bg))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--status-warn-text))] transition-colors hover:opacity-80 cursor-pointer"
      >
        Revoke
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
            aria-describedby={descriptionId}
            className="relative w-full max-w-md rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] shadow-2xl"
          >
            <div className="border-b border-[hsl(var(--border-default))] px-6 py-5">
              <p id={titleId} className="text-sm font-semibold text-[hsl(var(--text-primary))]">Revoke credential</p>
              <p id={descriptionId} className="mt-0.5 text-xs text-[hsl(var(--text-tertiary))]">
                This updates the public verification result and records the revocation reason. This action cannot be undone.
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-4 py-3">
                <p className="kicker mb-1.5">Credential</p>
                <p className="text-sm font-medium text-[hsl(var(--text-primary))]">{summary.degree}</p>
                <p className="text-xs text-[hsl(var(--text-tertiary))]">{summary.studentName} · {summary.studentId}</p>
                {summary.issuerName ? <p className="text-xs text-[hsl(var(--text-quaternary))]">{summary.issuerName}</p> : null}
              </div>
              <div className="space-y-1.5">
                <label htmlFor={reasonId} className="field-label">
                  Revocation reason <span className="text-[hsl(var(--status-error-text))]">*</span>
                </label>
                <select
                  id={reasonId}
                  value={reason}
                  onChange={(e) => setReason(e.target.value as RevocationReason | "")}
                  className="field-shell w-full"
                  required
                >
                  <option value="">Select a reason…</option>
                  {(Object.keys(REVOCATION_REASON_LABELS) as RevocationReason[]).map((key) => (
                    <option key={key} value={key}>{REVOCATION_REASON_LABELS[key]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor={notesId} className="field-label">
                  Notes <span className="text-[hsl(var(--text-quaternary))] font-normal">(optional)</span>
                </label>
                <textarea
                  id={notesId}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Additional context…"
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
                onClick={() => setIsOpen(false)}
                className="btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isSubmitting || !reason}
                className="inline-flex items-center rounded border border-[hsl(var(--status-warn-border))] bg-[hsl(var(--status-warn-bg))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--status-warn-text))] transition-colors hover:opacity-80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Revoking…" : "Confirm revoke"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
