"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowSquareOut,
  BookOpen,
  Gear,
  House,
  IdentificationCard,
  LockKey,
  ShieldCheck,
  Stack,
  UsersThree,
} from "@phosphor-icons/react";

import { AppLogo } from "./app-logo";
import { LanguageToggle } from "./language-toggle";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";
import { useLanguage } from "../lib/i18n";

type DashboardRole = "OWNER" | "SUPER_ADMIN" | "ADMIN" | "AUDITOR";

function isSuperAdmin(role: DashboardRole): boolean {
  return role === "SUPER_ADMIN" || role === "OWNER";
}

interface DashboardShellProps {
  admin: {
    username: string | null;
    email: string;
    role: DashboardRole;
    issuer: {
      name: string;
      displayName: string | null;
      domain: string;
    } | null;
  };
  children: React.ReactNode;
}

const navigationGroups = [
  {
    titleKey: "overview",
    items: [
      {
        href: "/dashboard",
        labelKey: "dashboard",
        icon: House,
        roles: ["OWNER", "SUPER_ADMIN", "ADMIN", "AUDITOR"] as DashboardRole[],
      },
    ],
  },
  {
    titleKey: "credentials",
    items: [
      {
        href: "/dashboard/credentials",
        labelKey: "registry",
        icon: IdentificationCard,
        roles: ["OWNER", "SUPER_ADMIN", "ADMIN", "AUDITOR"] as DashboardRole[],
      },
      {
        href: "/dashboard/issue",
        labelKey: "issue",
        icon: IdentificationCard,
        roles: ["OWNER", "SUPER_ADMIN", "ADMIN"] as DashboardRole[],
      },
    ],
  },
  {
    titleKey: "documents",
    items: [
      {
        href: "/dashboard/document-proofs",
        labelKey: "secureDocuments",
        icon: ShieldCheck,
        roles: ["OWNER", "SUPER_ADMIN", "ADMIN", "AUDITOR"] as DashboardRole[],
      },
    ],
  },
  {
    titleKey: "activity",
    items: [
      {
        href: "/dashboard/logs",
        labelKey: "verificationLogs",
        icon: Stack,
        roles: ["OWNER", "SUPER_ADMIN", "ADMIN", "AUDITOR"] as DashboardRole[],
      },
      {
        href: "/dashboard/blockchain",
        labelKey: "auditTrail",
        icon: LockKey,
        roles: ["OWNER", "SUPER_ADMIN", "ADMIN", "AUDITOR"] as DashboardRole[],
      },
    ],
  },
  {
    titleKey: "administration",
    items: [
      {
        href: "/dashboard/team",
        labelKey: "administrators",
        icon: UsersThree,
        roles: ["OWNER", "SUPER_ADMIN"] as DashboardRole[],
      },
      {
        href: "/dashboard/settings",
        labelKey: "settings",
        icon: Gear,
        roles: ["OWNER", "SUPER_ADMIN"] as DashboardRole[],
      },
      {
        href: "/dashboard/guide",
        labelKey: "guide",
        icon: BookOpen,
        roles: ["OWNER", "SUPER_ADMIN", "ADMIN", "AUDITOR"] as DashboardRole[],
      },
    ],
  },
] as const;

export function DashboardShell({ admin, children }: DashboardShellProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const roleLabels: Record<DashboardRole, string> = {
    OWNER: t.roles.superAdmin,
    SUPER_ADMIN: t.roles.superAdmin,
    ADMIN: t.roles.adminOperator,
    AUDITOR: t.roles.auditorViewer,
  };
  const institutionLabel =
    admin.issuer?.displayName ?? admin.issuer?.name ?? t.dashboardShell.fallbackInstitution;
  const operatorLabel = `@${admin.username ?? admin.email.split("@")[0]}`;

  const visibleGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(admin.role)),
    }))
    .filter((group) => group.items.length > 0);

  const flatItems = visibleGroups.flatMap((group) => group.items);
  const currentItem =
    flatItems.find((item) => pathname === item.href) ??
    [...flatItems]
      .sort((a, b) => b.href.length - a.href.length)
      .find(
        (item) => item.href !== "/dashboard" && pathname.startsWith(item.href),
      ) ??
    flatItems[0];

  return (
    <div className="app-shell">
      <div className="mx-auto grid min-h-dvh w-full grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="sidebar-surface hidden lg:flex flex-col">
          <div className="flex h-full flex-col px-4 py-5">
            {/* Logo */}
            <div className="px-2 mb-6">
              <AppLogo />
            </div>

            {/* Workspace identity */}
            <div className="mb-4 px-2">
              <p className="kicker mb-1.5">{institutionLabel}</p>
              <p
                className="text-xs text-[hsl(var(--text-tertiary))] truncate"
                title={operatorLabel}
              >
                {operatorLabel}
              </p>
              <div className="mt-2">
                <span className="role-chip">{roleLabels[admin.role] ?? admin.role}</span>
              </div>
            </div>

            {/* Separator */}
            <div className="mb-4 border-t border-[hsl(var(--border-default))]" />

            {/* Navigation */}
            <nav className="flex-1 space-y-4" aria-label={t.dashboardShell.navAria}>
              {visibleGroups.map((group) => (
                <div key={group.titleKey}>
                  <p className="kicker px-2 mb-1">
                    {t.dashboardShell.groups[group.titleKey]}
                  </p>
                  <div className="space-y-px">
                    {group.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" &&
                          pathname.startsWith(item.href));

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          className={`nav-item ${isActive ? "nav-item-active" : ""}`}
                        >
                          <item.icon
                            size={14}
                            weight={isActive ? "fill" : "regular"}
                            className="shrink-0 opacity-70"
                            aria-hidden
                          />
                          <span>{t.dashboardShell.items[item.labelKey]}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Footer links */}
            <div className="mt-4 pt-4 border-t border-[hsl(var(--border-default))]">
              <p className="kicker px-2 mb-1">{t.common.public}</p>
              <div className="space-y-px">
                <Link href="/verify" target="_blank" className="nav-item">
                  <ArrowSquareOut
                    size={13}
                    className="shrink-0 opacity-50"
                    aria-hidden
                  />
                  <span>{t.nav.credentialCheck}</span>
                </Link>
                <Link
                  href="/verify/document"
                  target="_blank"
                  className="nav-item"
                >
                  <ArrowSquareOut
                    size={13}
                    className="shrink-0 opacity-50"
                    aria-hidden
                  />
                  <span>{t.nav.documentCheck}</span>
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col">
          {/* Topbar */}
          <header className="topbar-surface sticky top-0 z-10 px-6 py-0 h-12 flex items-center">
            <div className="flex w-full items-center justify-between gap-4">
              {/* Left: mobile logo / breadcrumb */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="lg:hidden">
                  <AppLogo />
                </div>
                <div className="hidden lg:flex items-center gap-2 min-w-0 text-xs">
                  <span className="text-[hsl(var(--text-tertiary))] truncate max-w-35">
                    {institutionLabel}
                  </span>
                  <span className="text-[hsl(var(--border-strong))] select-none">
                    /
                  </span>
                  <span className="text-[hsl(var(--text-secondary))] font-medium truncate">
                    {currentItem
                      ? t.dashboardShell.items[currentItem.labelKey]
                      : t.dashboardShell.items.dashboard}
                  </span>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2">
                <Link
                  href="/verify"
                  target="_blank"
                  className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-[hsl(var(--border-default))] bg-transparent text-[0.75rem] font-medium text-[hsl(var(--text-tertiary))] transition-colors hover:bg-[hsl(var(--bg-muted))] hover:text-[hsl(var(--text-primary))] hover:border-[hsl(var(--border-strong))]"
                >
                  <ArrowSquareOut size={12} aria-hidden />
                  {t.common.verify}
                </Link>
                <LanguageToggle />
                <ThemeToggle />
                <LogoutButton />
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 px-6 py-7 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
