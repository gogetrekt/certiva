import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  FileText,
  IdentificationCard,
  Info,
  LockKey,
  Shield,
  ShieldWarning,
  Stack,
  UsersThree,
  Warning,
} from "@phosphor-icons/react/dist/ssr";

import {
  getCurrentAdmin,
  getSessionToken,
} from "../../../lib/api";
import { getServerDictionary } from "../../../lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return {
    title: t.adminGuide.title,
    description: t.adminGuide.subtitle,
  };
}

type AdminRole = "OWNER" | "SUPER_ADMIN" | "ADMIN" | "AUDITOR";

function isSuperAdmin(role: AdminRole) {
  return role === "OWNER" || role === "SUPER_ADMIN";
}

export default async function AdminGuidePage() {
  const token = await getSessionToken();
  if (!token) return null;
  const [admin, t] = await Promise.all([getCurrentAdmin(token), getServerDictionary()]);
  const role = admin.role as AdminRole;
  const superAdmin = isSuperAdmin(role);

  const g = t.adminGuide;

  const sectionIds = {
    overview: "overview",
    workflow: "workflow",
    credentialLifecycle: "credential-lifecycle",
    documentProofs: "document-proofs",
    roles: "roles",
    bulkActions: "bulk-actions",
    auditLogs: "audit-logs",
    safetyRules: "safety-rules",
  };

  const tocItems = [
    { id: sectionIds.overview, label: g.sections.overview },
    { id: sectionIds.workflow, label: g.sections.workflow },
    { id: sectionIds.credentialLifecycle, label: g.sections.credentialLifecycle },
    { id: sectionIds.documentProofs, label: g.sections.documentProofs },
    { id: sectionIds.roles, label: g.sections.roles },
    { id: sectionIds.bulkActions, label: g.sections.bulkActions },
    { id: sectionIds.auditLogs, label: g.sections.auditLogs },
    { id: sectionIds.safetyRules, label: g.sections.safetyRules },
  ];

  const roleBadgeColors: Record<string, string> = {
    "Full access": "border-[hsl(var(--status-valid-border))] bg-[hsl(var(--status-valid-bg))] text-[hsl(var(--status-valid-text))]",
    "Daily operations": "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-secondary))]",
    "Read-only": "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-tertiary))]",
    "Akses penuh": "border-[hsl(var(--status-valid-border))] bg-[hsl(var(--status-valid-bg))] text-[hsl(var(--status-valid-text))]",
    "Operasional harian": "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-secondary))]",
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="pb-5 border-b border-[hsl(var(--border-default))]">
        <p className="kicker mb-2">{g.kicker}</p>
        <h1 className="page-title">{g.title}</h1>
        <p className="body-text mt-1.5 max-w-lg">{g.subtitle}</p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[200px_minmax(0,1fr)]">
        {/* TOC sidebar */}
        <nav className="hidden xl:block" aria-label={g.toc}>
          <p className="kicker mb-3">{g.toc}</p>
          <ul className="space-y-1">
            {tocItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="block rounded px-2 py-1.5 text-xs text-[hsl(var(--text-tertiary))] transition-colors hover:bg-[hsl(var(--bg-subtle))] hover:text-[hsl(var(--text-primary))]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <div className="space-y-10 min-w-0">

          {/* Quick links */}
          <div className="work-surface overflow-hidden p-0">
            <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
              <div className="flex items-center gap-2">
                <ArrowRight size={14} className="text-[hsl(var(--text-tertiary))]" aria-hidden />
                <p className="text-sm font-semibold text-[hsl(var(--text-primary))]">{g.quickLinks.title}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 px-5 py-4">
              {g.quickLinks.links.map((link) => {
                const allowed = (link.roles as readonly string[]).includes(role);
                if (!allowed) return null;
                return (
                  <Link key={link.href} href={link.href} className="btn-ghost btn-sm">
                    {link.label}
                    <ArrowRight size={11} aria-hidden />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section: Overview */}
          <section id={sectionIds.overview} className="scroll-mt-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))]">
                <BookOpen size={14} className="text-[hsl(var(--text-tertiary))]" aria-hidden />
              </span>
              <h2 className="section-title">{g.sections.overview}</h2>
            </div>
            <div className="work-surface p-5 space-y-0">
              <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))] mb-2">{g.overview.title}</h3>
              <p className="text-sm leading-6 text-[hsl(var(--text-secondary))]">{g.overview.body}</p>
            </div>
          </section>

          {/* Section: Recommended workflow */}
          <section id={sectionIds.workflow} className="scroll-mt-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))]">
                <Stack size={14} className="text-[hsl(var(--text-tertiary))]" aria-hidden />
              </span>
              <h2 className="section-title">{g.sections.workflow}</h2>
            </div>
            <div className="work-surface overflow-hidden p-0">
              <div className="px-5 py-4 border-b border-[hsl(var(--border-subtle))]">
                <p className="text-xs text-[hsl(var(--text-tertiary))]">{g.workflow.intro}</p>
              </div>
              <ol className="divide-y divide-[hsl(var(--border-subtle))]">
                {g.workflow.steps.map((step) => (
                  <li key={step.n} className="flex gap-4 px-5 py-4">
                    <span className="mt-0.5 shrink-0 font-mono text-[0.625rem] font-semibold text-[hsl(var(--text-quaternary))] w-5 pt-0.5">
                      {step.n}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--text-primary))] mb-1">{step.title}</p>
                      <p className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Section: Credential lifecycle */}
          <section id={sectionIds.credentialLifecycle} className="scroll-mt-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))]">
                <IdentificationCard size={14} className="text-[hsl(var(--text-tertiary))]" aria-hidden />
              </span>
              <h2 className="section-title">{g.sections.credentialLifecycle}</h2>
            </div>
            <div className="space-y-4">
              {/* Status states */}
              <div className="work-surface overflow-hidden p-0">
                <ol className="divide-y divide-[hsl(var(--border-subtle))]">
                  {g.credentialLifecycle.states.map((state) => (
                    <li key={state.label} className="flex items-start gap-3 px-5 py-3.5">
                      <span className="mt-0.5 shrink-0 inline-flex items-center rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-1.5 py-0.5 text-[0.625rem] font-semibold text-[hsl(var(--text-secondary))]">
                        {state.label}
                      </span>
                      <p className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">{state.description}</p>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Issue + bulk issue + check status */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="work-surface p-5">
                  <p className="text-sm font-semibold text-[hsl(var(--text-primary))] mb-2">{g.credentialLifecycle.issueTitle}</p>
                  <p className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">{g.credentialLifecycle.issueBody}</p>
                  {role !== "AUDITOR" && (
                    <Link href="/dashboard/issue" className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] transition-colors">
                      {g.credentialLifecycle.issueTitle} <ArrowRight size={11} aria-hidden />
                    </Link>
                  )}
                </div>
                <div className="work-surface p-5">
                  <p className="text-sm font-semibold text-[hsl(var(--text-primary))] mb-2">{g.credentialLifecycle.bulkIssueTitle}</p>
                  <p className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">{g.credentialLifecycle.bulkIssueBody}</p>
                </div>
              </div>
              <div className="work-surface p-5">
                <p className="text-sm font-semibold text-[hsl(var(--text-primary))] mb-2">{g.credentialLifecycle.checkTitle}</p>
                <p className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">{g.credentialLifecycle.checkBody}</p>
                <Link href="/dashboard/credentials" className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] transition-colors">
                  {t.dashboardShell.items.registry} <ArrowRight size={11} aria-hidden />
                </Link>
              </div>
            </div>
          </section>

          {/* Section: Document proofs */}
          <section id={sectionIds.documentProofs} className="scroll-mt-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))]">
                <FileText size={14} className="text-[hsl(var(--text-tertiary))]" aria-hidden />
              </span>
              <h2 className="section-title">{g.sections.documentProofs}</h2>
            </div>
            <div className="work-surface overflow-hidden p-0">
              <div className="px-5 py-4 border-b border-[hsl(var(--border-subtle))]">
                <p className="text-sm leading-6 text-[hsl(var(--text-secondary))]">{g.documentProofs.body}</p>
              </div>
              <ol className="divide-y divide-[hsl(var(--border-subtle))]">
                {g.documentProofs.steps.map((step, i) => (
                  <li key={i} className="flex gap-4 px-5 py-3.5">
                    <span className="mt-0.5 shrink-0 font-mono text-[0.625rem] font-semibold text-[hsl(var(--text-quaternary))] w-5 pt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">{step}</p>
                  </li>
                ))}
              </ol>
              {role !== "AUDITOR" && (
                <div className="px-5 py-3 border-t border-[hsl(var(--border-subtle))]">
                  <Link href="/dashboard/document-proofs" className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] transition-colors">
                    {t.dashboardShell.items.secureDocuments} <ArrowRight size={11} aria-hidden />
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Section: Roles and permissions */}
          <section id={sectionIds.roles} className="scroll-mt-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))]">
                <UsersThree size={14} className="text-[hsl(var(--text-tertiary))]" aria-hidden />
              </span>
              <h2 className="section-title">{g.sections.roles}</h2>
            </div>
            <div className="work-surface overflow-hidden p-0">
              <div className="px-5 py-4 border-b border-[hsl(var(--border-subtle))]">
                <p className="text-xs text-[hsl(var(--text-tertiary))]">{g.roles.intro}</p>
              </div>
              <div className="divide-y divide-[hsl(var(--border-subtle))]">
                {g.roles.items.map((item) => (
                  <div key={item.role} className="px-5 py-5">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-sm font-semibold text-[hsl(var(--text-primary))]">{item.role}</span>
                      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[0.625rem] font-semibold ${roleBadgeColors[item.badge] ?? "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-secondary))]"}`}>
                        {item.badge}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {item.permissions.map((perm, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--text-quaternary))]" aria-hidden />
                          <span className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">{perm}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section: Bulk actions (Super Admin only) */}
          {superAdmin && (
            <section id={sectionIds.bulkActions} className="scroll-mt-6">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))]">
                  <Shield size={14} className="text-[hsl(var(--text-tertiary))]" aria-hidden />
                </span>
                <h2 className="section-title">{g.sections.bulkActions}</h2>
              </div>
              <div className="space-y-4">
                <div className="work-surface overflow-hidden p-0">
                  <div className="px-5 py-4 border-b border-[hsl(var(--border-subtle))]">
                    <p className="text-xs text-[hsl(var(--text-tertiary))]">{g.bulkActions.intro}</p>
                  </div>
                  <div className="divide-y divide-[hsl(var(--border-subtle))]">
                    {[
                      { title: g.bulkActions.revokeTitle, body: g.bulkActions.revokeBody },
                      { title: g.bulkActions.deleteCredTitle, body: g.bulkActions.deleteCredBody },
                      { title: g.bulkActions.deleteProofTitle, body: g.bulkActions.deleteProofBody },
                    ].map((item) => (
                      <div key={item.title} className="px-5 py-4">
                        <p className="text-sm font-semibold text-[hsl(var(--text-primary))] mb-1.5">{item.title}</p>
                        <p className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">{item.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Warning callout */}
                <div className="flex gap-3 rounded-lg border border-[hsl(var(--status-warn-border))] bg-[hsl(var(--status-warn-bg))] px-4 py-3.5">
                  <Warning size={15} className="mt-0.5 shrink-0 text-[hsl(var(--status-warn-text))]" aria-hidden />
                  <p className="text-xs leading-5 text-[hsl(var(--status-warn-text))]">{g.bulkActions.warning}</p>
                </div>
              </div>
            </section>
          )}

          {/* Section: Audit logs */}
          <section id={sectionIds.auditLogs} className="scroll-mt-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))]">
                <LockKey size={14} className="text-[hsl(var(--text-tertiary))]" aria-hidden />
              </span>
              <h2 className="section-title">{g.sections.auditLogs}</h2>
            </div>
            <div className="work-surface p-5">
              <p className="text-sm leading-6 text-[hsl(var(--text-secondary))]">{g.auditLogs.body}</p>
              <Link href="/dashboard/blockchain" className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] transition-colors">
                {t.dashboardShell.items.auditTrail} <ArrowRight size={11} aria-hidden />
              </Link>
            </div>
          </section>

          {/* Section: Safety rules */}
          <section id={sectionIds.safetyRules} className="scroll-mt-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))]">
                <ShieldWarning size={14} className="text-[hsl(var(--text-tertiary))]" aria-hidden />
              </span>
              <h2 className="section-title">{g.sections.safetyRules}</h2>
            </div>
            <div className="work-surface overflow-hidden p-0">
              <ul className="divide-y divide-[hsl(var(--border-subtle))]">
                {g.safetyRules.items.map((item, i) => (
                  <li key={i} className="flex gap-3 px-5 py-4">
                    <Info size={14} className="mt-0.5 shrink-0 text-[hsl(var(--text-quaternary))]" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--text-primary))] mb-1">{item.rule}</p>
                      <p className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
