import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { getServerDictionary } from "../../lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();

  return {
    title: t.footer.privacyPolicy,
    description: t.metadata.privacyDescription,
  };
}

export default async function PrivacyPage() {
  const t = await getServerDictionary();

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />

      <div className="mx-auto max-w-300 px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 sm:py-12 md:py-14">
          <p className="kicker mb-3">{t.legal.kicker}</p>
          <h1 className="text-[1.625rem] sm:text-[2rem] font-semibold tracking-[-0.04em] leading-[1.08] md:text-[2.5rem]">
            {t.legal.privacy.title}
          </h1>
          <p className="mt-3 max-w-[52ch] text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
            {t.legal.privacy.intro}
          </p>
          <div className="mt-5 inline-flex items-center rounded-md border border-[hsl(var(--status-warn-border))] bg-[hsl(var(--status-warn-bg))] px-3 py-1.5">
            <p className="text-[0.75rem] leading-normal text-[hsl(var(--status-warn-text))]">
              {t.legal.draftNotice}
            </p>
          </div>
        </div>

        {/* Policy sections */}
        <div className="divide-y divide-[hsl(var(--border-subtle))] py-4">
          {t.legal.privacy.sections.map(({ heading, body }) => (
            <div
              key={heading}
              className="grid gap-4 py-8 md:grid-cols-[220px_1fr] md:gap-12"
            >
              <h2 className="text-[0.8125rem] font-semibold tracking-tight text-[hsl(var(--text-primary))]">
                {heading}
              </h2>
              {body === null ? (
                <p className="text-sm leading-[1.75] text-[hsl(var(--text-secondary))]">
                  {t.legal.privacy.contactPrefix}{" "}
                  <Link
                    href="/contact"
                    className="text-[hsl(var(--text-primary))] underline underline-offset-3 decoration-[hsl(var(--border-strong))] hover:decoration-[hsl(var(--text-primary))] transition-colors duration-150"
                  >
                    {t.legal.privacy.contactLink}
                  </Link>
                  .
                </p>
              ) : (
                <p className="text-sm leading-[1.75] text-[hsl(var(--text-secondary))]">
                  {body}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Revision note */}
        <div className="pb-10 pt-2">
          <p className="text-[0.6875rem] text-[hsl(var(--text-quaternary))]">
            {t.legal.revision}
          </p>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
