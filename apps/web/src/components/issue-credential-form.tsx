"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { useLanguage } from "../lib/i18n";

interface IssueCredentialFormProps {
  institutionName?: string;
}

export function IssueCredentialForm({ institutionName }: IssueCredentialFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      studentName: String(formData.get("studentName") ?? ""),
      studentId: String(formData.get("studentId") ?? ""),
      degree: String(formData.get("degree") ?? ""),
    };

    try {
      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { verificationId?: string; message?: string };
      if (!response.ok) throw new Error(body.message ?? t.forms.issueCredential.unable);

      setSuccess(
        body.verificationId
          ? `${t.forms.issueCredential.successPrefix} ${body.verificationId}`
          : t.forms.issueCredential.successDefault,
      );
      startTransition(() => { router.refresh(); });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.forms.issueCredential.unable);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {institutionName ? (
        <div className="space-y-1.5">
          <label className="field-label">{t.forms.issueCredential.institution}</label>
          <input value={institutionName} readOnly disabled className="field-shell w-full opacity-60" />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="studentName" className="field-label">{t.forms.issueCredential.studentName}</label>
          <input id="studentName" name="studentName" placeholder="Rafi Pratama" required className="field-shell w-full" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="studentId" className="field-label">{t.forms.issueCredential.studentId}</label>
          <input id="studentId" name="studentId" placeholder="STU-2026-001" required className="field-shell w-full font-mono" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="degree" className="field-label">{t.forms.issueCredential.credentialTitle}</label>
        <input id="degree" name="degree" placeholder={t.forms.issueCredential.placeholderDegree} required className="field-shell w-full" />
      </div>

      <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-4 py-3">
        <p className="text-xs font-medium text-[hsl(var(--text-secondary))]">{t.forms.issueCredential.infoTitle}</p>
        <p className="mt-1 text-xs leading-5 text-[hsl(var(--text-tertiary))]">
          {t.forms.issueCredential.infoBody}
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-4 py-3 text-xs text-[hsl(var(--status-error-text))]">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-[hsl(var(--status-valid-border))] bg-[hsl(var(--status-valid-bg))] px-4 py-3 text-xs text-[hsl(var(--status-valid-text))]">
          {success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary mt-1 inline-flex w-full items-center justify-center"
      >
        {isSubmitting ? t.forms.issueCredential.submitting : t.forms.issueCredential.submit}
      </button>
    </form>
  );
}
