"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileArrowUp, ArrowRight } from "@phosphor-icons/react";

import type { DocumentProofRecord } from "../lib/api";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export function CreateDocumentProofForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<DocumentProofRecord | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(() => { setCreated(null); });

    const file = fileInputRef.current?.files?.[0];
    if (!title.trim() || !documentType.trim()) {
      setError("Title and document type are required.");
      return;
    }
    if (!file) {
      setError("Choose a PDF document to register.");
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError("PDF uploads must be 10MB or smaller.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("documentType", documentType.trim());
      if (referenceNumber.trim()) formData.set("referenceNumber", referenceNumber.trim());
      if (documentDate) formData.set("documentDate", documentDate);
      formData.set("file", file, file.name);

      const response = await fetch("/api/document-proofs", { method: "POST", body: formData });
      const payload = (await response.json()) as DocumentProofRecord | { message?: string };
      if (!response.ok) {
        throw new Error("message" in payload ? payload.message : "Unable to register document proof.");
      }
      startTransition(() => { setCreated(payload as DocumentProofRecord); });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register document proof.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="proof-title" className="field-label">Document title</label>
          <input
            id="proof-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Official transcript 2026"
            className="field-shell w-full"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="document-type" className="field-label">Document type</label>
          <input
            id="document-type"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            placeholder="Transcript, MoU, legal"
            className="field-shell w-full"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reference-number" className="field-label">Reference number</label>
          <input
            id="reference-number"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="DOC-2026-0148"
            className="field-shell w-full font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="document-date" className="field-label">Document date</label>
          <input
            id="document-date"
            type="date"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
            className="field-shell w-full"
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => { setFileName(e.target.files?.[0]?.name ?? null); setError(null); }}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-4 py-5 text-center transition-colors hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--bg-muted))]"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] text-[hsl(var(--text-secondary))]">
          <FileArrowUp size={16} />
        </div>
        <div>
          <p className="text-sm font-medium text-[hsl(var(--text-primary))]">{fileName ?? "Choose a PDF"}</p>
          <p className="text-xs text-[hsl(var(--text-quaternary))]">{fileName ? "Click to change" : "Max 10MB · SHA-256 hashed on upload"}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-4 py-3 text-xs text-[hsl(var(--status-error-text))]">{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary inline-flex w-full items-center justify-center gap-2"
      >
        {isSubmitting ? "Registering…" : "Register document proof"}
        {!isSubmitting && <ArrowRight size={14} weight="bold" />}
      </button>

      {created ? (
        <div className="rounded-lg border border-[hsl(var(--status-valid-border))] bg-[hsl(var(--status-valid-bg))] px-4 py-4 space-y-2">
          <p className="text-xs font-semibold text-[hsl(var(--status-valid-text))]">Document proof registered.</p>
          <div className="space-y-1">
            <p className="text-[0.6875rem] text-[hsl(var(--text-quaternary))]">Verification code</p>
            <p className="hash-text">{created.verificationCode}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[0.6875rem] text-[hsl(var(--text-quaternary))]">SHA-256</p>
            <p className="hash-text wrap-break-word leading-5">{created.sourceHash}</p>
          </div>
        </div>
      ) : null}
    </form>
  );
}
