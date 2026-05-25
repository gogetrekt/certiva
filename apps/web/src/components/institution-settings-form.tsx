"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import type { InstitutionRecord } from "../lib/api";
import { useLanguage } from "../lib/i18n";

export function InstitutionSettingsForm({ institution }: { institution: InstitutionRecord }) {
  const router = useRouter();
  const { t } = useLanguage();
  const f = t.forms.institutionSettings;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: String(formData.get("name") ?? ""),
      displayName: String(formData.get("displayName") ?? "") || undefined,
      domain: String(formData.get("domain") ?? ""),
      websiteUrl: String(formData.get("websiteUrl") ?? "") || undefined,
      logoUrl: undefined,
      wallet: String(formData.get("wallet") ?? "") || undefined,
      status: String(formData.get("status") ?? institution.status),
    };

    try {
      const response = await fetch("/api/institution", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? f.unableUpdate);
      setSuccess(f.saved);
      startTransition(() => { router.refresh(); });
    } catch (err) {
      setError(err instanceof Error ? err.message : f.unableUpdate);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4 max-w-2xl">
      {/* 2-col card grid on md+, stacked on mobile */}
      <div className="grid gap-3 md:grid-cols-2">

        {/* Card: Institution Identity */}
        <SettingsCard label={f.identity} hint={f.identityHint}>
          <Field label={f.institutionName} hint={f.institutionNameHint}>
            <input
              id="name"
              name="name"
              defaultValue={institution.name}
              required
              className="field-shell w-full"
            />
          </Field>
          <Field label={f.displayName} hint={f.displayNameHint}>
            <input
              id="displayName"
              name="displayName"
              defaultValue={institution.displayName ?? ""}
              className="field-shell w-full"
            />
          </Field>
        </SettingsCard>

        {/* Card: Public Branding */}
        <SettingsCard label={f.publicBranding} hint={f.publicBrandingHint}>
          <Field label={f.websiteUrl}>
            <input
              id="websiteUrl"
              name="websiteUrl"
              defaultValue={institution.websiteUrl ?? ""}
              placeholder={f.websiteUrlPlaceholder}
              className="field-shell w-full"
            />
          </Field>
        </SettingsCard>

        {/* Card: Verification Settings */}
        <SettingsCard label={f.verificationSettings} hint={f.verificationSettingsHint}>
          <Field label={f.primaryDomain} hint={f.primaryDomainHint}>
            <input
              id="domain"
              name="domain"
              defaultValue={institution.domain}
              required
              className="field-shell w-full font-mono"
            />
          </Field>
          <Field label={t.common.status} hint={f.statusHint}>
            <select
              id="status"
              name="status"
              defaultValue={institution.status}
              className="field-shell w-full"
            >
              <option value="ACTIVE">{t.common.active}</option>
              <option value="INACTIVE">{t.common.inactive}</option>
              <option value="SUSPENDED">{t.common.suspended}</option>
            </select>
          </Field>
        </SettingsCard>

        {/* Card: Blockchain Proof */}
        <SettingsCard label={f.blockchain} hint={f.blockchainHint}>
          <Field label={f.issuerWallet} hint={f.issuerWalletHint}>
            <input
              id="wallet"
              name="wallet"
              defaultValue={institution.wallet ?? ""}
              placeholder={f.issuerWalletPlaceholder}
              className="field-shell w-full font-mono"
            />
          </Field>
        </SettingsCard>
      </div>

      {/* Save row */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary"
        >
          {isSubmitting ? f.saving : f.save}
        </button>

        {success ? (
          <span className="text-xs text-[hsl(var(--status-valid-text))]">{success}</span>
        ) : null}

        {error ? (
          <span className="text-xs text-[hsl(var(--status-error-text))]">{error}</span>
        ) : null}
      </div>
    </form>
  );
}

function SettingsCard({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-page))] p-4 space-y-3">
      <div className="pb-2 border-b border-[hsl(var(--border-subtle))]">
        <p className="text-xs font-semibold text-[hsl(var(--text-primary))] tracking-wide uppercase">{label}</p>
        {hint ? <p className="text-[0.6875rem] leading-4 text-[hsl(var(--text-tertiary))] mt-0.5">{hint}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-[hsl(var(--text-secondary))]">{label}</p>
      {hint ? <p className="text-[0.6875rem] leading-4 text-[hsl(var(--text-quaternary))]">{hint}</p> : null}
      {children}
    </div>
  );
}
