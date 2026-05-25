import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { getServerDictionary } from "../../lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();

  return {
    title: t.footer.security,
    description: t.metadata.securityDescription,
  };
}

export default async function SecurityPage() {
  const t = await getServerDictionary();

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />

      <div className="mx-auto max-w-300 px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 sm:py-12 md:py-14">
          <p className="kicker mb-3">{t.security.kicker}</p>
          <h1 className="text-[1.625rem] sm:text-[2rem] font-semibold tracking-[-0.04em] leading-[1.08] md:text-[2.5rem]">
            {t.security.title}
          </h1>
          <p className="mt-3 max-w-[52ch] text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
            {t.security.intro}
          </p>
        </div>

        {/* Security principles */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-8">{t.security.model}</p>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--border-default))] md:grid-cols-2">
            {t.security.principles.map(({ kicker, title, body }) => (
              <div key={title} className="bg-[hsl(var(--bg-base))] px-7 py-7">
                <p className="kicker mb-3">{kicker}</p>
                <h2 className="mb-2.5 text-[0.9375rem] font-semibold tracking-tight">
                  {title}
                </h2>
                <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Deployment hardening */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <div className="md:flex md:items-start md:gap-16">
            <div className="mb-8 shrink-0 md:mb-0 md:w-52">
              <p className="kicker mb-2">{t.security.deployment}</p>
              <p className="text-[0.8125rem] leading-[1.6] text-[hsl(var(--text-secondary))]">
                {t.security.deploymentBody}
              </p>
            </div>
            <div className="flex-1 divide-y divide-[hsl(var(--border-subtle))] overflow-hidden rounded-xl border border-[hsl(var(--border-default))]">
              {t.security.hardening.map(({ area, items }) => (
                <div key={area} className="bg-[hsl(var(--bg-base))] px-6 py-5">
                  <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[hsl(var(--text-tertiary))]">
                    {area}
                  </p>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span
                          className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--border-strong))]"
                          aria-hidden
                        />
                        <span className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Disclosures */}
        <div className="py-10 md:py-12">
          <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-7 py-7">
            <p className="kicker mb-5">{t.security.disclosures}</p>
            <ul className="space-y-3.5">
              {t.security.disclosureItems.map((note) => (
                <li key={note} className="flex items-start gap-3">
                  <span
                    className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--border-strong))]"
                    aria-hidden
                  />
                  <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">
                    {note}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-[hsl(var(--border-subtle))] pt-5">
              <p className="text-[0.8125rem] leading-[1.6] text-[hsl(var(--text-tertiary))]">
                {t.security.questionsPrefix}{" "}
                <Link
                  href="/contact"
                  className="text-[hsl(var(--text-secondary))] underline underline-offset-3 decoration-[hsl(var(--border-strong))] hover:decoration-[hsl(var(--text-secondary))] transition-colors duration-150"
                >
                  {t.security.contactUs}
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
