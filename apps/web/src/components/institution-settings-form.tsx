"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import type { InstitutionRecord } from "../lib/api";

export function InstitutionSettingsForm({ institution }: { institution: InstitutionRecord }) {
  const router = useRouter();
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
      logoUrl: String(formData.get("logoUrl") ?? "") || undefined,
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
      if (!response.ok) throw new Error(body.message ?? "Unable to update settings");
      setSuccess("Settings saved.");
      startTransition(() => { router.refresh(); });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update settings");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-0">

      {/* Group: Identity */}
      <SettingsSection label="Identity">
        <SettingsRow
          label="Institution name"
          hint="Full legal name of the institution"
        >
          <input
            id="name"
            name="name"
            defaultValue={institution.name}
            required
            className="field-shell w-full"
          />
        </SettingsRow>
        <SettingsRow
          label="Display name"
          hint="Short name shown on public pages"
        >
          <input
            id="displayName"
            name="displayName"
            defaultValue={institution.displayName ?? ""}
            className="field-shell w-full"
          />
        </SettingsRow>
        <SettingsRow
          label="Website URL"
        >
          <input
            id="websiteUrl"
            name="websiteUrl"
            defaultValue={institution.websiteUrl ?? ""}
            placeholder="https://university.edu"
            className="field-shell w-full"
          />
        </SettingsRow>
        <SettingsRow
          label="Logo URL"
        >
          <input
            id="logoUrl"
            name="logoUrl"
            defaultValue={institution.logoUrl ?? ""}
            placeholder="https://…"
            className="field-shell w-full"
          />
        </SettingsRow>
      </SettingsSection>

      {/* Group: Domain & Status */}
      <SettingsSection label="Configuration">
        <SettingsRow
          label="Primary domain"
          hint="Used for verification and branding"
        >
          <input
            id="domain"
            name="domain"
            defaultValue={institution.domain}
            required
            className="field-shell w-full font-mono"
          />
        </SettingsRow>
        <SettingsRow
          label="Status"
          hint="Controls issuance and public access"
        >
          <select
            id="status"
            name="status"
            defaultValue={institution.status}
            className="field-shell w-full"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </SettingsRow>
      </SettingsSection>

      {/* Group: Blockchain */}
      <SettingsSection label="Blockchain">
        <SettingsRow
          label="Issuer wallet"
          hint="Polygon Amoy address for on-chain proof anchoring"
        >
          <input
            id="wallet"
            name="wallet"
            defaultValue={institution.wallet ?? ""}
            placeholder="0x…"
            className="field-shell w-full font-mono"
          />
        </SettingsRow>
      </SettingsSection>

      {/* Footer */}
      <div className="pt-5 border-t border-[hsl(var(--border-default))] flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary"
        >
          {isSubmitting ? "Saving…" : "Save settings"}
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

function SettingsSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[hsl(var(--border-subtle))] pb-5 mb-5">
      <p className="kicker mb-3">{label}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[200px_1fr] sm:items-start">
      <div className="pt-1.5">
        <p className="text-xs font-medium text-[hsl(var(--text-secondary))]">{label}</p>
        {hint ? <p className="text-[0.6875rem] leading-4 text-[hsl(var(--text-quaternary))] mt-0.5">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
