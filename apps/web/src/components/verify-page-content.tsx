"use client";

import Link from "next/link";

import { useLanguage } from "../lib/i18n";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { VerifyPdfReferenceForm } from "./verify-pdf-reference-form";
import { VerifySearchForm } from "./verify-search-form";

export function VerifyPageContent() {
  const { t } = useLanguage();

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />

      <div className="mx-auto max-w-275 px-8">
        {/* Page intent */}
        <div className="pt-12 pb-10 border-b border-[hsl(var(--border-default))]">
          <p className="kicker mb-3">{t.verify.kicker}</p>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] leading-[1.08] text-[hsl(var(--text-primary))] md:text-[2.5rem]">
            {t.verify.heading}
          </h1>
          <p className="mt-3 max-w-120 text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
            {t.verify.description}
          </p>
        </div>

        {/* Primary method */}
        <div className="py-10 border-b border-[hsl(var(--border-default))]">
          <div className="grid gap-10 md:grid-cols-[1fr_400px]">
            <div>
              <p className="kicker mb-2">{t.verify.primaryMethodKicker}</p>
              <h2 className="text-[1.1875rem] font-semibold tracking-tight text-[hsl(var(--text-primary))] mb-2.5">
                {t.verify.primaryMethodHeading}
              </h2>
              <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))] max-w-[360px]">
                {t.verify.primaryMethodDescription}
              </p>

              <div className="mt-6 space-y-2.5">
                {t.verify.bullets.map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--border-strong))]"
                      aria-hidden
                    />
                    <p className="text-xs leading-[1.6] text-[hsl(var(--text-tertiary))]">
                      <span className="font-semibold text-[hsl(var(--text-secondary))]">
                        {item.label}.
                      </span>{" "}
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="work-surface p-6 self-start">
              <VerifySearchForm />
            </div>
          </div>
        </div>

        {/* Secondary method */}
        <div className="py-10 border-b border-[hsl(var(--border-default))]">
          <div className="grid gap-10 md:grid-cols-[1fr_400px]">
            <div>
              <p className="kicker mb-2">{t.verify.secondaryMethodKicker}</p>
              <h2 className="text-[1.1875rem] font-semibold tracking-tight text-[hsl(var(--text-primary))] mb-2.5">
                {t.verify.secondaryMethodHeading}
              </h2>
              <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))] max-w-[360px]">
                {t.verify.secondaryMethodDescription}
              </p>
              <p className="mt-4 text-xs leading-[1.6] text-[hsl(var(--text-quaternary))]">
                {t.verify.secondaryMethodNote}{" "}
                <Link
                  href="/verify/document"
                  className="text-[hsl(var(--text-secondary))] underline underline-offset-2 hover:text-[hsl(var(--text-primary))] transition-colors"
                >
                  {t.verify.documentCheckLink}
                </Link>{" "}
                {t.verify.secondaryMethodNoteSuffix}
              </p>
            </div>

            <div className="work-surface p-6 self-start">
              <VerifyPdfReferenceForm />
            </div>
          </div>
        </div>

        <div className="py-10" />
      </div>

      <SiteFooter />
    </div>
  );
}
