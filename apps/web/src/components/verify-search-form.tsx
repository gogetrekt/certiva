"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";

import { useLanguage } from "../lib/i18n";

interface VerifySearchFormProps {
  initialValue?: string;
  compact?: boolean;
}

export function VerifySearchForm({ initialValue = "", compact = false }: VerifySearchFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [verificationId, setVerificationId] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setVerificationId(initialValue);
  }, [initialValue]);

  useEffect(() => {
    setIsSubmitting(false);
  }, [pathname]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const value = String(formData.get("verificationId") ?? "").trim();
    if (!value) {
      setError(t.verifyForm.errorEmpty);
      return;
    }

    setIsSubmitting(true);
    const nextPath = `/verify/${encodeURIComponent(value)}`;
    if (pathname === nextPath) {
      router.refresh();
      return;
    }

    router.push(nextPath);
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          id="verificationId"
          name="verificationId"
          placeholder="vrf_..."
          value={verificationId}
          onChange={(e) => setVerificationId(e.target.value)}
          required
          className="field-shell min-w-0 flex-1 font-mono text-xs"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary btn-sm shrink-0 inline-flex items-center gap-1.5"
        >
          {isSubmitting ? "..." : <><span>{t.verifyForm.compactSubmit}</span><ArrowRight size={11} weight="bold" /></>}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="verificationId" className="field-label">
          {t.verifyForm.label}
        </label>
        <input
          id="verificationId"
          name="verificationId"
          placeholder="vrf_2f9a0cdbe7c14231f6"
          value={verificationId}
          onChange={(e) => setVerificationId(e.target.value)}
          required
          className="field-shell w-full font-mono"
        />
        {error ? <p className="text-xs text-[hsl(var(--status-error-text))]">{error}</p> : null}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary inline-flex w-full items-center justify-center gap-2"
      >
        {isSubmitting ? t.verifyForm.submitting : t.verifyForm.submit}
        {!isSubmitting && <ArrowRight size={14} weight="bold" />}
      </button>
    </form>
  );
}
