"use client";

import { useRef, useState } from "react";
import { FilePdf, ArrowRight } from "@phosphor-icons/react";

import { useLanguage } from "../lib/i18n";

interface CredentialPdfLookupResponse {
  result: "VALID" | "INVALID" | "REVOKED" | "NOT_FOUND" | "TAMPERED";
  verificationId?: string | null;
  resolvedReference?: string | null;
  credential?: {
    verificationId?: string;
  } | null;
}

export function VerifyPdfReferenceForm() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useLanguage();
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const file = inputRef.current?.files?.[0];

    if (!file) {
      setMessage(t.verifyPdfForm.errorNoFile);
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("file", file, file.name);
      const response = await fetch("/api/verify/credential/pdf", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | CredentialPdfLookupResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error("message" in payload ? payload.message : t.verifyPdfForm.errorUnableToRead);
      }

      const verificationId =
        "verificationId" in payload
          ? payload.verificationId ?? payload.credential?.verificationId
          : null;

      if (verificationId) {
        window.location.href = `/verify/${encodeURIComponent(verificationId)}`;
        return;
      }

      setMessage(t.verifyPdfForm.errorNoReference);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.verifyPdfForm.errorUnableToRead);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          setMessage(null);
          setFileName(event.target.files?.[0]?.name ?? null);
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-4 py-6 text-center transition-colors hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--bg-muted))]"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] text-[hsl(var(--text-secondary))]">
          <FilePdf size={18} />
        </div>
        <div>
          <p className="text-sm font-medium text-[hsl(var(--text-primary))]">
            {fileName ?? t.verifyPdfForm.chooseFile}
          </p>
          <p className="mt-0.5 text-xs text-[hsl(var(--text-quaternary))]">
            {fileName ? t.verifyPdfForm.changeFile : t.verifyPdfForm.fileSubtitle}
          </p>
        </div>
      </div>
      {message ? (
        <p className="text-xs text-[hsl(var(--status-error-text))]">{message}</p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary inline-flex w-full items-center justify-center gap-2"
      >
        {isSubmitting ? t.verifyPdfForm.submitting : t.verifyPdfForm.submit}
        {!isSubmitting && <ArrowRight size={14} weight="bold" />}
      </button>
    </form>
  );
}
