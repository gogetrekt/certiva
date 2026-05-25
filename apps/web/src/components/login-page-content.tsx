"use client";

import { useLanguage } from "../lib/i18n";
import { LoginForm } from "./login-form";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

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
  const { t } = useLanguage();

  return (
    <div className="bg-[hsl(var(--bg-base))] p-4 sm:p-5">
      <p className="kicker mb-4">{title}</p>
      <div className="space-y-3">
        <div>
          <p className="text-[0.6875rem] text-[hsl(var(--text-quaternary))] mb-1">
            {t.login.usernameLabel}
          </p>
          <p className="font-mono text-[0.8125rem] text-[hsl(var(--text-primary))]">
            @{username}
          </p>
        </div>
        <div>
          <p className="text-[0.6875rem] text-[hsl(var(--text-quaternary))] mb-1">
            {t.login.passwordLabel}
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

export function LoginPageContent() {
  const { t } = useLanguage();

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-10 sm:py-14 md:py-20">
        <div className="grid gap-10 sm:gap-14 lg:grid-cols-[1fr_400px] lg:gap-20 xl:gap-24">

          {/* Sign-in form -- shown first on mobile */}
          <div className="order-first lg:order-last">
            <div className="work-surface p-5 sm:p-7 md:p-8">
              <div className="mb-6">
                <h2 className="text-base font-semibold tracking-tight text-[hsl(var(--text-primary))]">
                  {t.login.formHeading}
                </h2>
                <p className="mt-1 text-sm text-[hsl(var(--text-tertiary))]">
                  {t.login.formDescription}
                </p>
              </div>
              <LoginForm />
            </div>
            <p className="mt-4 text-center text-xs text-[hsl(var(--text-quaternary))]">
              {t.login.formFooterNote}
            </p>
          </div>

          {/* Left -- institutional context */}
          <div className="flex flex-col justify-between gap-10 sm:gap-12 order-last lg:order-first">
            <div>
              <p className="kicker mb-4 sm:mb-5">{t.login.kicker}</p>
              <h1 className="text-[1.625rem] sm:text-[2rem] font-semibold tracking-[-0.04em] leading-[1.1] text-[hsl(var(--text-primary))] md:text-[2.5rem]">
                {t.login.heading}
              </h1>
              <p className="mt-4 sm:mt-5 text-sm leading-[1.7] text-[hsl(var(--text-secondary))] max-w-105">
                {t.login.description}
              </p>
            </div>

            {/* Demo credentials */}
            <div>
              <p className="kicker mb-4">{t.login.demoAccessKicker}</p>
              <div className="grid gap-px overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--border-default))] sm:grid-cols-2">
                <DemoCredential
                  title={t.login.superAdminTitle}
                  username="admin"
                  password="admin123"
                  note={t.login.superAdminNote}
                />
                <DemoCredential
                  title={t.login.adminTitle}
                  username="admin2"
                  password="admin123"
                  note={t.login.adminNote}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
