"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLanguage } from "../lib/i18n";
import { AppLogo } from "./app-logo";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={["public-nav-link", active ? "public-nav-link--active" : ""]
        .join(" ")
        .trim()}
    >
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navLinks = [
    { href: "/verify", label: t.nav.credentialCheck },
    { href: "/verify/document", label: t.nav.documentCheck },
  ] as const;

  return (
    <header className="site-header">
      <div className="mx-auto flex h-15 w-full max-w-300 items-center justify-between px-6 sm:px-8">
        <AppLogo />

        <nav
          className="flex items-center gap-0.5 sm:gap-1"
          aria-label={t.nav.ariaLabel}
        >
          <div className="hidden items-center gap-0.5 sm:flex">
            {navLinks.map(({ href, label }) => (
              <NavLink key={href} href={href} active={pathname === href}>
                {label}
              </NavLink>
            ))}
          </div>

          <div className="ml-1 flex items-center gap-1.5 sm:ml-2 sm:gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              href="/login"
              aria-current={pathname === "/login" ? "page" : undefined}
              className="public-nav-cta"
            >
              {t.nav.signIn}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
