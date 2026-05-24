"use client";

import Link from "next/link";
import { useRef, useState, startTransition } from "react";
import {
  CheckCircle,
  FilePdf,
  Warning,
  X,
  XCircle,
} from "@phosphor-icons/react";

import type { DocumentProofVerificationResponse } from "../lib/api";
import { formatDateTime } from "../lib/date-format";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export function VerifyUploadPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DocumentProofVerificationResponse | null>(null);

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    const [file] = Array.from(event.dataTransfer.files);
    void selectFile(file);
  }

  async function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const [file] = Array.from(event.target.files ?? []);
    await selectFile(file);
  }

  async function selectFile(file?: File) {
    setError(null);
    startTransition(() => { setResult(null); });
    if (!file) return;
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setSelectedFile(null);
      setError("PDF uploads must be 10 MB or smaller.");
      return;
    }
    const normalizedName = file.name.trim().toLowerCase();
    const normalizedType = file.type.trim().toLowerCase();
    if (
      normalizedType !== "application/pdf" &&
      normalizedType !== "application/x-pdf" &&
      !normalizedName.endsWith(".pdf")
    ) {
      setSelectedFile(null);
      setError("Select an official PDF document.");
      return;
    }
    setSelectedFile(file);
  }

  function clearFile() {
    setSelectedFile(null);
    setError(null);
    startTransition(() => { setResult(null); });
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleUploadKeyDown(event: React.KeyboardEvent<HTMLLabelElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(() => { setResult(null); });
    if (!selectedFile) { setError("Choose a PDF document to continue."); return; }
    setIsSubmitting(true);
    setProgress(0);
    try {
      const response = await uploadPdf(selectedFile, (p) => { setProgress(p); });
      startTransition(() => { setResult(response); });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to verify this document proof.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        ref={inputRef}
        id="verify-upload-input"
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={handleInputChange}
        tabIndex={-1}
        aria-hidden
      />

      {/* Upload zone -- entire area is the interaction target */}
      <div className="relative">
        <label
          htmlFor="verify-upload-input"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleUploadKeyDown}
          role="button"
          tabIndex={0}
          aria-label={selectedFile ? `Selected: ${selectedFile.name}. Click to change.` : "Upload a PDF -- click or drag and drop"}
          className={[
            "relative block w-full rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer text-left",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--border-focus))] focus-visible:ring-offset-2",
            isDragging
              ? "border-[hsl(var(--border-focus))] bg-[hsl(var(--bg-muted))] scale-[1.005]"
              : selectedFile
                ? "border-[hsl(var(--border-strong))] bg-[hsl(var(--bg-subtle))] hover:border-[hsl(var(--border-focus))]"
                : "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--bg-muted))]",
          ].join(" ")}
        >
          {selectedFile ? (
            /* Selected state */
            <div className="flex items-start gap-4 px-6 py-5 pr-12">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] text-[hsl(var(--text-secondary))]">
                <FilePdf size={18} weight="duotone" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[hsl(var(--text-primary))] truncate">{selectedFile.name}</p>
                <p className="mt-0.5 text-xs text-[hsl(var(--text-quaternary))]">
                  {formatFileSize(selectedFile.size)} · Click to change
                </p>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              {isDragging ? (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[hsl(var(--border-focus))] bg-[hsl(var(--bg-base))] text-[hsl(var(--text-secondary))]">
                    <FilePdf size={22} weight="duotone" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-[hsl(var(--text-primary))]">Drop to verify</p>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] text-[hsl(var(--text-tertiary))]">
                    <FilePdf size={22} weight="duotone" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[hsl(var(--text-primary))]">
                      Drop a PDF here, or click to select
                    </p>
                    <p className="mt-1 text-xs text-[hsl(var(--text-quaternary))]">
                      PDF only · Max 10 MB · Processed in memory, not stored
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </label>

        {selectedFile ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clearFile(); }}
            className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-md text-[hsl(var(--text-quaternary))] transition-colors hover:bg-[hsl(var(--bg-muted))] hover:text-[hsl(var(--text-primary))] cursor-pointer"
            aria-label="Remove selected file"
          >
            <X size={12} weight="bold" aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-lg border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-4 py-3 text-xs text-[hsl(var(--status-error-text))]">
          {error}
        </div>
      ) : null}

      {/* Submit row */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-[hsl(var(--text-quaternary))]">
          SHA-256 hash comparison only. File is not stored.
        </p>
        <button
          type="submit"
          disabled={isSubmitting || !selectedFile}
          className="btn-primary shrink-0"
        >
          {isSubmitting ? "Verifying…" : "Verify document"}
        </button>
      </div>

      {/* Progress */}
      {isSubmitting ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[hsl(var(--text-tertiary))]">
            <span>Uploading and comparing hash…</span>
            <span className="font-mono text-[hsl(var(--text-primary))]">{progress}%</span>
          </div>
          <div className="h-1 rounded-full bg-[hsl(var(--border-default))]">
            <div
              className="h-1 rounded-full bg-[hsl(var(--text-secondary))] transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Result */}
      {!isSubmitting && result ? (
        <ResultCard result={result} />
      ) : !isSubmitting && !result ? (
        <ResultPlaceholder />
      ) : null}
    </form>
  );
}

function ResultCard({ result }: { result: DocumentProofVerificationResponse }) {
  const config =
    result.status === "AUTHENTIC"
      ? { verdict: "Verified", title: "Document hash confirmed", accentClass: "result-accent-valid", verdictClass: "badge badge-valid", Icon: CheckCircle }
      : result.status === "REVOKED"
        ? { verdict: "Revoked", title: "Proof record found", accentClass: "result-accent-warn", verdictClass: "badge badge-warn", Icon: Warning }
        : result.status === "DOCUMENT_MODIFIED"
          ? { verdict: "Modified", title: "Tamper detection triggered", accentClass: "result-accent-error", verdictClass: "badge badge-error", Icon: XCircle }
          : { verdict: "Not found", title: "No trusted proof match", accentClass: "result-accent-neutral", verdictClass: "badge badge-neutral", Icon: XCircle };

  const { Icon } = config;

  return (
    <div className={`work-surface p-5 ${config.accentClass}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <span className={config.verdictClass}>
            <Icon size={9} weight="fill" aria-hidden />
            {config.verdict}
          </span>
          <h2 className="mt-3 text-lg font-semibold tracking-tight text-[hsl(var(--text-primary))]">{config.title}</h2>
        </div>
        <Icon size={20} weight="duotone" className="text-[hsl(var(--text-tertiary))] shrink-0 mt-0.5" aria-hidden />
      </div>

      {result.status === "NOT_FOUND" ? (
        <div className="space-y-2 text-sm leading-6 text-[hsl(var(--text-secondary))]">
          <p className="font-medium text-[hsl(var(--text-primary))]">No secure document proof matched this PDF.</p>
          <p>The institution may not have registered this document, or the uploaded file may not carry a Certiva proof reference.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">
            {result.status === "REVOKED"
              ? "The proof record exists, but it is no longer active."
              : result.status === "AUTHENTIC"
                ? "The uploaded PDF hash matches the registered SHA-256."
                : "The uploaded PDF hash does not match the registered SHA-256."}
          </p>

          <div className="overflow-hidden rounded-lg border border-[hsl(var(--border-default))]">
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "Document title", value: result.title ?? "Not available" },
                  { label: "Issued by", value: result.issuedBy ?? "Not available" },
                  { label: "Document type", value: result.documentType ?? "Not available" },
                  { label: "Document date", value: result.documentDate ? formatDateTime(result.documentDate) : "Not available" },
                  { label: "Verification timestamp", value: formatDateTime(result.verificationTimestamp) },
                  { label: "Verification count", value: String(result.verificationCount ?? 0) },
                  { label: "Hash comparison", value: result.integrityMatched ? "Match" : "Mismatch" },
                  { label: "Resolved reference", value: result.resolvedReference ?? "Not available" },
                  { label: "Registered SHA-256", value: result.registeredHash ?? "Not available", mono: true },
                  { label: "Uploaded SHA-256", value: result.uploadedHash ?? "Not available", mono: true },
                ].map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : "bg-[hsl(var(--bg-base))]"}>
                    <td className="w-36 shrink-0 px-3 py-2.5 text-xs font-medium text-[hsl(var(--text-tertiary))] align-middle">{row.label}</td>
                    <td className={`px-3 py-2.5 text-[hsl(var(--text-primary))] align-middle ${(row as { mono?: boolean }).mono ? "hash-text wrap-break-word leading-5" : "text-xs"}`}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.verificationId ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/proof/${encodeURIComponent(result.verificationId)}`} className="btn-ghost btn-sm">
                Open proof record
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ResultPlaceholder() {
  return (
    <div className="rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-subtle))] px-5 py-8 text-center">
      <p className="text-xs text-[hsl(var(--text-quaternary))]">
        Upload a PDF above to compare its SHA-256 hash against the registered proof record.
      </p>
    </div>
  );
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function uploadPdf(file: File, onProgress: (progress: number) => void) {
  return new Promise<DocumentProofVerificationResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/verify/document");
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      const payload = xhr.response as DocumentProofVerificationResponse | { message?: string } | null;
      if (xhr.status >= 200 && xhr.status < 300 && payload) {
        onProgress(100);
        resolve(payload as DocumentProofVerificationResponse);
        return;
      }
      reject(new Error((payload && "message" in payload && payload.message) || "Unable to verify this document proof."));
    };

    xhr.onerror = () => { reject(new Error("Unable to reach the document verification service.")); };

    const formData = new FormData();
    formData.append("file", file, file.name);
    xhr.send(formData);
  });
}
