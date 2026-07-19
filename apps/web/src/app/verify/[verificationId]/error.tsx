"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";

import { SiteHeader } from "../../../components/site-header";
import { useLanguage } from "../../../lib/i18n";

export default function VerifyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />
      <div className="mx-auto max-w-275 px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="work-surface mx-auto max-w-md p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] text-[hsl(var(--status-error-text))]">
            <WarningCircle size={22} aria-hidden />
          </div>
          <h1 className="section-title">{t.errorStates.verifyTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--text-secondary))]">
            {t.errorStates.verifyDescription}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="btn-primary inline-flex items-center gap-2"
            >
              <ArrowClockwise size={15} aria-hidden />
              {t.errorStates.retry}
            </button>
            <Link href="/verify" className="btn-ghost btn-sm">
              {t.errorStates.backToVerify}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
