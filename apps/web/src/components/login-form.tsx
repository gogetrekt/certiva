"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    const payload = {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "Unable to sign in");
      }

      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to sign in",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="username" className="field-label">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          placeholder="admin"
          autoComplete="username"
          autoCapitalize="none"
          required
          className="field-shell w-full"
        />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className="field-shell w-full pr-10 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
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

      {error ? (
        <div className="rounded-lg border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-4 py-3 text-sm text-[hsl(var(--status-error-text))]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full mt-2"
        style={{ height: "2.375rem" }}
      >
        {isSubmitting ? "Signing in..." : "Sign in to workspace"}
      </button>
    </form>
  );
}
