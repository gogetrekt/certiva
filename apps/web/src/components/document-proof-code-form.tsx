"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";

import { useLanguage } from "../lib/i18n";

interface DocumentProofCodeFormProps {
  compact?: boolean;
  initialValue?: string;
}

export function DocumentProofCodeForm({ compact = false, initialValue = "" }: DocumentProofCodeFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = value.trim();
    if (!trimmed) {
      setError(t.documentProofForm.errorEmpty);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/verify/document/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId: trimmed, verificationCode: trimmed }),
      });
      const payload = (await response.json()) as
        | { verificationId?: string | null; message?: string; status?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? t.documentProofForm.errorUnableToVerify);
      }

      if (payload?.verificationId) {
        router.push(`/proof/${encodeURIComponent(payload.verificationId)}`);
        router.refresh();
        return;
      }
      setError(t.documentProofForm.errorNotFound);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.documentProofForm.errorUnableToVerify);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.documentProofForm.compactPlaceholder}
          className="field-shell min-w-0 flex-1 font-mono text-xs"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary btn-sm shrink-0 inline-flex items-center gap-1.5"
        >
          {isSubmitting ? "..." : <><span>{t.documentProofForm.compactSubmit}</span><ArrowRight size={11} weight="bold" /></>}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="document-proof-reference" className="field-label">
          {t.documentProofForm.label}
        </label>
        <input
          id="document-proof-reference"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.documentProofForm.fullPlaceholder}
          className="field-shell w-full font-mono"
        />
        {error ? <p className="text-xs text-[hsl(var(--status-error-text))]">{error}</p> : null}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary inline-flex w-full items-center justify-center gap-2"
      >
        {isSubmitting ? t.documentProofForm.submitting : t.documentProofForm.submit}
        {!isSubmitting && <ArrowRight size={14} weight="bold" />}
      </button>
    </form>
  );
}
