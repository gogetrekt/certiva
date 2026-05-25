"use client";

import Link from "next/link";

import { useLanguage } from "../lib/i18n";
import { DocumentProofCodeForm } from "./document-proof-code-form";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { VerifyUploadPanel } from "./verify-upload-panel";

export function DocumentPageContent() {
  const { t } = useLanguage();

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />

      <div className="mx-auto max-w-275 px-4 sm:px-6 lg:px-8">
        {/* Page intent */}
        <div className="pt-10 sm:pt-12 pb-8 sm:pb-10 border-b border-[hsl(var(--border-default))]">
          <p className="kicker mb-3">{t.document.kicker}</p>
          <h1 className="text-[1.625rem] sm:text-[2rem] font-semibold tracking-[-0.04em] leading-[1.08] text-[hsl(var(--text-primary))] md:text-[2.5rem]">
            {t.document.heading}
          </h1>
          <p className="mt-3 max-w-120 text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
            {t.document.description}
          </p>
        </div>

        {/* Primary workflow: upload */}
        <div className="py-8 sm:py-10 border-b border-[hsl(var(--border-default))]">
          <div className="grid gap-8 sm:gap-10 md:grid-cols-[1fr_340px]">
            {/* Upload area */}
            <div>
              <p className="kicker mb-2">{t.document.primaryMethodKicker}</p>
              <h2 className="text-[1.1875rem] font-semibold tracking-tight text-[hsl(var(--text-primary))] mb-6">
                {t.document.primaryMethodHeading}
              </h2>
              <VerifyUploadPanel />
            </div>

            {/* Secondary + scope sidebar */}
            <div className="space-y-5 self-start">
              <div className="work-surface overflow-hidden p-0">
                <div className="px-4 sm:px-5 py-4 border-b border-[hsl(var(--border-default))]">
                  <p className="kicker mb-1">{t.document.metadataLookupKicker}</p>
                  <h3 className="section-title mb-1">
                    {t.document.metadataLookupHeading}
                  </h3>
                  <p className="meta-text">{t.document.metadataLookupDescription}</p>
                </div>
                <div className="px-4 sm:px-5 py-5">
                  <DocumentProofCodeForm compact />
                </div>
              </div>

              <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-4 sm:px-5 py-4">
                <p className="kicker mb-3">{t.document.whatThisChecksKicker}</p>
                <div className="space-y-2.5">
                  {t.document.whatThisChecks.map((note) => (
                    <div key={note} className="flex items-start gap-2.5">
                      <span
                        className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--border-strong))]"
                        aria-hidden
                      />
                      <p className="text-xs leading-[1.6] text-[hsl(var(--text-tertiary))]">
                        {note}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[hsl(var(--border-subtle))]">
                  <p className="text-xs leading-[1.6] text-[hsl(var(--text-quaternary))]">
                    {t.document.credentialCheckNote}{" "}
                    <Link
                      href="/verify"
                      className="text-[hsl(var(--text-secondary))] underline underline-offset-2 hover:text-[hsl(var(--text-primary))] transition-colors"
                    >
                      {t.document.credentialCheckLink}
                    </Link>
                    {t.document.credentialCheckNoteSuffix}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="py-8 sm:py-10" />
      </div>

      <SiteFooter />
    </div>
  );
}
