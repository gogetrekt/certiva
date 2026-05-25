"use client";

import Link from "next/link";

import { useLanguage } from "../lib/i18n";
import { AppLogo } from "./app-logo";

export function SiteFooter() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  const verifyLinks = [
    { href: "/verify", label: t.nav.credentialCheck },
    { href: "/verify/document", label: t.nav.documentCheck },
    { href: "/login", label: t.nav.signIn },
  ] as const;

  const helpLinks = [
    { href: "/guide", label: t.footer.verificationGuide },
    { href: "/contact", label: t.footer.contact },
    { href: "/security", label: t.footer.security },
  ] as const;

  const legalLinks = [
    { href: "/privacy", label: t.footer.privacyPolicy },
    { href: "/terms", label: t.footer.termsOfUse },
  ] as const;

  function FooterSection({
    heading,
    links,
  }: {
    heading: string;
    links: readonly { href: string; label: string }[];
  }) {
    return (
      <div>
        <p className="mb-3.5 text-[0.6875rem] font-semibold tracking-[0.08em] uppercase text-[hsl(var(--text-primary))]">
          {heading}
        </p>
        <ul className="flex flex-col gap-2.5">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className="site-footer-link">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <footer className="site-footer">
      <div className="mx-auto w-full max-w-300 px-4 sm:px-6 lg:px-8">
        {/* Main grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-10 sm:gap-x-8 sm:py-12 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:gap-x-10 md:py-14">
          {/* Col 1 -- Brand */}
          <div className="col-span-2 md:col-span-1">
            <AppLogo />
            <p className="mt-4 text-[0.8125rem] font-medium leading-[1.55] text-[hsl(var(--text-secondary))]">
              {t.footer.tagline}
            </p>
            <p className="mt-2 max-w-70 text-[0.75rem] leading-[1.6] text-[hsl(var(--text-tertiary))]">
              {t.footer.description}
            </p>
          </div>

          <FooterSection heading={t.footer.verifySection} links={verifyLinks} />
          <FooterSection heading={t.footer.guidanceSection} links={helpLinks} />
          <FooterSection heading={t.footer.legalSection} links={legalLinks} />
        </div>

        {/* Meta row */}
        <div className="flex flex-col gap-2 border-t border-[hsl(var(--border-subtle))] py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <p className="text-[0.6875rem] text-[hsl(var(--text-quaternary))]">
            &copy; {year} Certiva. {t.footer.copyrightSuffix}
          </p>
          <p className="text-[0.6875rem] text-[hsl(var(--text-quaternary))]">
            {t.footer.builtFor}
          </p>
        </div>
      </div>
    </footer>
  );
}
