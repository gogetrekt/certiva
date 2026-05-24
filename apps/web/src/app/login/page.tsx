import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "../../components/login-form";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { getCurrentAdmin, getSessionToken } from "../../lib/api";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Certiva institution workspace.",
};

export default async function LoginPage() {
  const token = await getSessionToken();
  if (token) {
    // Verify the token is actually valid before sending the user to the dashboard.
    // A stale cookie (e.g. after a DB wipe or rename) is structurally present but
    // the backend will return 401. Trusting presence alone causes login→dashboard→
    // layout-401→clear→login loops. Verify first; on any failure, fall through and
    // show the login form so the user can authenticate fresh.
    try {
      await getCurrentAdmin(token);
      redirect("/dashboard");
    } catch {
      // Token invalid — fall through to show the login form.
      // The stale cookie will be cleaned up by /api/session/clear when the layout
      // next rejects it, or the user can just log in and the new token overwrites it.
    }
  }

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />

      {/* ── Split layout ───────────────────────────────── */}
      <div className="mx-auto max-w-[1200px] px-8 py-14 md:py-20">
        <div className="grid gap-14 lg:grid-cols-[1fr_400px] lg:gap-20 xl:gap-24">
          {/* Left — institutional context */}
          <div className="flex flex-col justify-between gap-12">
            <div>
              <p className="kicker mb-5">Institution admin access</p>
              <h1 className="text-[2rem] font-semibold tracking-[-0.04em] leading-[1.1] text-[hsl(var(--text-primary))] md:text-[2.5rem]">
                Sign in to manage issuance and verification operations.
              </h1>
              <p className="mt-5 text-sm leading-[1.7] text-[hsl(var(--text-secondary))] max-w-[420px]">
                This workspace is reserved for institutional administrators.
                Super admins manage institution settings and team access. Admins
                handle issuance, credential operations, and verification review.
              </p>
            </div>

            {/* Demo credentials */}
            <div>
              <p className="kicker mb-4">Demo access</p>
              <div className="grid gap-px overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--border-default))] sm:grid-cols-2">
                <DemoCredential
                  title="Super admin"
                  username="admin"
                  password="admin123"
                  note="Full institutional administration"
                />
                <DemoCredential
                  title="Admin"
                  username="admin2"
                  password="admin123"
                  note="Credential management access"
                />
              </div>
            </div>
          </div>

          {/* Right — sign-in form */}
          <div>
            <div className="work-surface p-7 md:p-8">
              <div className="mb-6">
                <h2 className="text-base font-semibold tracking-tight text-[hsl(var(--text-primary))]">
                  Sign In
                </h2>
                <p className="mt-1 text-sm text-[hsl(var(--text-tertiary))]">
                  Enter your authorized admin credentials.
                </p>
              </div>
              <LoginForm />
            </div>
            <p className="mt-4 text-center text-xs text-[hsl(var(--text-quaternary))]">
              Access restricted to authorized institutional administrators.
            </p>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function DemoCredential({
  title,
  username,
  password,
  note,
}: {
  title: string;
  username: string;
  password: string;
  note: string;
}) {
  return (
    <div className="bg-[hsl(var(--bg-base))] p-5">
      <p className="kicker mb-4">{title}</p>
      <div className="space-y-3">
        <div>
          <p className="text-[0.6875rem] text-[hsl(var(--text-quaternary))] mb-1">
            Username
          </p>
          <p className="font-mono text-[0.8125rem] text-[hsl(var(--text-primary))]">
            @{username}
          </p>
        </div>
        <div>
          <p className="text-[0.6875rem] text-[hsl(var(--text-quaternary))] mb-1">
            Password
          </p>
          <p className="font-mono text-[0.8125rem] text-[hsl(var(--text-primary))]">
            {password}
          </p>
        </div>
        <p className="text-xs text-[hsl(var(--text-tertiary))] pt-1 border-t border-[hsl(var(--border-subtle))]">
          {note}
        </p>
      </div>
    </div>
  );
}
