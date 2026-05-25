"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { useLanguage } from "../lib/i18n";

type AdminRole = "OWNER" | "SUPER_ADMIN" | "ADMIN" | "AUDITOR";

interface CreateAdminFormProps {
  actorRole?: AdminRole;
}

export function CreateAdminForm({ actorRole }: CreateAdminFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? "ADMIN"),
    };

    try {
      const response = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? t.forms.createAdmin.unable);
      }
      setSuccess(t.forms.createAdmin.success);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.forms.createAdmin.unable);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="username" className="field-label">
          {t.forms.createAdmin.username}
        </label>
        <input
          id="username"
          name="username"
          type="text"
          placeholder="baak_hi"
          autoComplete="username"
          autoCapitalize="none"
          minLength={3}
          pattern="[A-Za-z0-9._-]+"
          required
          className="field-shell w-full"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="field-label">
          {t.forms.createAdmin.password}
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            minLength={8}
            autoComplete="new-password"
            required
            className="field-shell w-full pr-10 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? t.forms.createAdmin.hidePassword : t.forms.createAdmin.showPassword}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[hsl(var(--text-tertiary))] transition-colors duration-150 hover:bg-[hsl(var(--bg-muted))] hover:text-[hsl(var(--text-primary))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--border-strong))] cursor-pointer"
          >
            {showPassword ? (
              <EyeSlash size={15} aria-hidden />
            ) : (
              <Eye size={15} aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="role" className="field-label">
          {t.forms.createAdmin.role}
        </label>
        <select
          id="role"
          name="role"
          defaultValue="ADMIN"
          className="field-shell w-full text-sm"
        >
          {(actorRole === "OWNER" || actorRole === "SUPER_ADMIN") && (
            <option value="SUPER_ADMIN">{t.roles.superAdmin}</option>
          )}
          <option value="ADMIN">{t.roles.adminOperator}</option>
          <option value="AUDITOR">{t.roles.auditorViewer}</option>
        </select>
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
        className="btn-primary inline-flex w-full items-center justify-center"
      >
        {isSubmitting ? t.forms.createAdmin.creating : t.forms.createAdmin.submit}
      </button>
    </form>
  );
}
