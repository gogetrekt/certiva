import Link from "next/link";

import { AppLogo } from "./app-logo";

const verifyLinks = [
  { href: "/verify", label: "Credential Check" },
  { href: "/verify/document", label: "Document Check" },
  { href: "/login", label: "Sign In" },
] as const;

const helpLinks = [
  { href: "/guide", label: "Verification Guide" },
  { href: "/contact", label: "Contact" },
  { href: "/security", label: "Security" },
] as const;

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
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

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="mx-auto w-full max-w-300 px-6 sm:px-8">
        {/* Main grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-12 sm:grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:gap-x-10 md:py-14">
          {/* Col 1 — Brand */}
          <div className="col-span-2 md:col-span-1">
            <AppLogo />
            <p className="mt-4 text-[0.8125rem] font-medium leading-[1.55] text-[hsl(var(--text-secondary))]">
              Academic credential verification infrastructure.
            </p>
            <p className="mt-2 max-w-70 text-[0.75rem] leading-[1.6] text-[hsl(var(--text-tertiary))]">
              Public verification tools for issued academic credentials and sealed PDF records.
            </p>
          </div>

          {/* Col 2 — Verify */}
          <FooterSection heading="Verify" links={verifyLinks} />

          {/* Col 3 — Guidance */}
          <FooterSection heading="Guidance" links={helpLinks} />

          {/* Col 4 — Legal */}
          <FooterSection heading="Legal" links={legalLinks} />
        </div>

        {/* Meta row */}
        <div className="flex flex-col gap-2 border-t border-[hsl(var(--border-subtle))] py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <p className="text-[0.6875rem] text-[hsl(var(--text-quaternary))]">
            © {year} Certiva. All rights reserved.
          </p>
          <p className="text-[0.6875rem] text-[hsl(var(--text-quaternary))]">
            Built for public academic credential verification.
          </p>
        </div>
      </div>
    </footer>
  );
}
