"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { List, X } from "@phosphor-icons/react";

import { useLanguage } from "../lib/i18n";
import { AppLogo } from "./app-logo";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";

function NavLink({
  href,
  active,
  children,
  onClick,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Close drawer on route change (adjust-state-on-change, not an effect)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  // Move focus into the drawer, trap Tab, close on Escape, restore focus on close
  useEffect(() => {
    if (!mobileOpen) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    const previouslyFocused = triggerRef.current;
    const getFocusable = () =>
      Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        ),
      );

    getFocusable()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [mobileOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navLinks = [
    { href: "/verify", label: t.nav.credentialCheck },
    { href: "/verify/document", label: t.nav.documentCheck },
  ] as const;

  return (
    <>
      <header className="site-header">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <AppLogo />

          <nav
            className="flex items-center gap-1"
            aria-label={t.nav.ariaLabel}
          >
            {/* Desktop nav links */}
            <div className="hidden items-center gap-0.5 sm:flex">
              {navLinks.map(({ href, label }) => (
                <NavLink key={href} href={href} active={pathname === href}>
                  {label}
                </NavLink>
              ))}
            </div>

            {/* Desktop right controls */}
            <div className="hidden items-center gap-1.5 sm:flex sm:ml-2">
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

            {/* Mobile: lang + theme + hamburger */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <LanguageToggle />
              <ThemeToggle />
              <button
                ref={triggerRef}
                type="button"
                aria-label={t.nav.openMenu}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(true)}
                className="theme-toggle"
              >
                <List size={18} aria-hidden />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile nav sheet */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="mobile-nav-overlay"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />

          {/* Sheet */}
          <div
            ref={sheetRef}
            className="mobile-nav-sheet site-header"
            role="dialog"
            aria-modal="true"
            aria-label={t.nav.menuLabel}
          >
            <div className="flex items-center justify-between mb-4">
              <AppLogo />
              <button
                type="button"
                aria-label={t.nav.closeMenu}
                onClick={() => setMobileOpen(false)}
                className="theme-toggle"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              {navLinks.map(({ href, label }) => (
                <NavLink
                  key={href}
                  href={href}
                  active={pathname === href}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </NavLink>
              ))}
              <Link
                href="/login"
                aria-current={pathname === "/login" ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
                className="public-nav-cta mt-2 w-full justify-center"
              >
                {t.nav.signIn}
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
