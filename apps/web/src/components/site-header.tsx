"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppLogo } from "./app-logo";
import { ThemeToggle } from "./theme-toggle";

const navLinks = [
  { href: "/verify", label: "Credential Check" },
  { href: "/verify/document", label: "Document Check" },
] as const;

function NavLink({
  href,
  active,
  children,
  className,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex h-[34px] items-center rounded-[7px] border px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-[130ms]",
        active
          ? "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] text-[hsl(var(--text-primary))] shadow-[0_1px_3px_hsl(0_0%_0%/0.06)] dark:bg-[hsl(var(--bg-elevated))] dark:border-[hsl(var(--border-strong))] dark:shadow-none"
          : "border-[hsl(var(--border-subtle))] bg-transparent text-[hsl(var(--text-secondary))] hover:border-[hsl(var(--border-default))] hover:bg-[hsl(var(--bg-muted))] hover:text-[hsl(var(--text-primary))] dark:border-[hsl(var(--border-default))] dark:hover:bg-[hsl(var(--bg-elevated))] dark:hover:border-[hsl(var(--border-strong))]",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-6 sm:px-8">
        <AppLogo />

        <nav className="flex items-center gap-1" aria-label="Public navigation">
          {navLinks.map(({ href, label }) => (
            <NavLink
              key={href}
              href={href}
              active={pathname === href || pathname.startsWith(href + "/")}
            >
              {label}
            </NavLink>
          ))}

          <span
            className="mx-1.5 h-4 w-px bg-[hsl(var(--border-default))]"
            aria-hidden
          />

          <ThemeToggle />

          <NavLink
            href="/login"
            active={pathname === "/login"}
            className="ml-0.5"
          >
            Admin Sign In
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
