"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useId, useState } from "react";

type DocumentProofSummary = {
  title: string;
  referenceNumber: string | null;
};

export function DeleteDocumentProofButton({
  proofId,
  summary,
}: {
  proofId: string;
  summary: DocumentProofSummary;
}) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
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
      const response = await fetch(`/api/document-proofs/${proofId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "Unable to delete proof record");
      }
      setIsOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete proof record",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        className="inline-flex items-center rounded border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--status-error-text))] transition-colors hover:opacity-80 cursor-pointer"
      >
        Delete
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
              <p
                id={titleId}
                className="text-sm font-semibold text-[hsl(var(--text-primary))]"
              >
                Delete proof record?
              </p>
            </div>
            <div id={descriptionId} className="space-y-4 px-6 py-5">
              <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-4 py-3">
                <p className="kicker mb-1.5">Title</p>
                <p className="text-sm font-medium text-[hsl(var(--text-primary))]">
                  {summary.title}
                </p>
                <p className="kicker mt-3 mb-1.5">Reference</p>
                <p className="text-xs text-[hsl(var(--text-tertiary))]">
                  {summary.referenceNumber ?? "Not provided"}
                </p>
              </div>
              <div className="rounded-lg border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-4 py-3 text-xs leading-5 text-[hsl(var(--status-error-text))]">
                <p>
                  Only proof metadata and SHA256 hash records will be removed.
                </p>
                <p className="mt-2">
                  No source PDF files are stored in the system.
                </p>
                <p className="mt-2">This action cannot be undone.</p>
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
                onClick={handleDelete}
                disabled={isSubmitting}
                className="inline-flex items-center rounded border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--status-error-text))] transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
