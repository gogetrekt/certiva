import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  FileText,
  IdentificationCard,
  LockKey,
  Shield,
  ShieldWarning,
  Stack,
  UploadSimple,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";

import { getCurrentAdmin, getSessionToken } from "../../../lib/api";
import type { Dictionary } from "../../../lib/i18n-dictionary";
import { getServerDictionary } from "../../../lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return {
    title: t.adminGuide.title,
    description: t.adminGuide.subtitle,
  };
}

type AdminRole = "OWNER" | "SUPER_ADMIN" | "ADMIN" | "AUDITOR";

type GuideTopic = Dictionary["adminGuide"]["topics"][number];

interface AdminGuidePageProps {
  searchParams: Promise<{
    topic?: string;
  }>;
}

function isAllowed(role: AdminRole, roles: readonly string[]) {
  return roles.includes(role);
}

function getTopicIcon(id: string) {
  const icons = {
    overview: BookOpen,
    workflow: Stack,
    lifecycle: IdentificationCard,
    upload: UploadSimple,
    issue: IdentificationCard,
    status: CheckCircle,
    documentVerification: FileText,
    singleRevoke: ShieldWarning,
    bulkRevoke: Shield,
    bulkDelete: ShieldWarning,
    roles: UsersThree,
    audit: LockKey,
    safety: ShieldWarning,
  };

  return icons[id as keyof typeof icons] ?? BookOpen;
}

function roleToneClass(index: number) {
  if (index === 0) {
    return "border-[hsl(var(--status-valid-border))] bg-[hsl(var(--status-valid-bg))] text-[hsl(var(--status-valid-text))]";
  }

  if (index === 1) {
    return "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-secondary))]";
  }

  return "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-tertiary))]";
}

export default async function AdminGuidePage({
  searchParams,
}: AdminGuidePageProps) {
  const token = await getSessionToken();
  if (!token) return null;

  const [{ topic: selectedTopicId }, admin, t] = await Promise.all([
    searchParams,
    getCurrentAdmin(token),
    getServerDictionary(),
  ]);

  const role = admin.role as AdminRole;
  const g = t.adminGuide;
  const topics = g.topics as readonly GuideTopic[];
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId);

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-[hsl(var(--border-default))]">
        <p className="kicker mb-2">{g.kicker}</p>
        <h1 className="page-title">{g.title}</h1>
        <p className="body-text mt-1.5 max-w-2xl">{g.subtitle}</p>
      </div>

      {selectedTopic ? (
        <TopicDetail topic={selectedTopic} labels={g} role={role} />
      ) : (
        <TopicIndex topics={topics} labels={g} role={role} />
      )}
    </div>
  );
}

function TopicIndex({
  topics,
  labels,
  role,
}: {
  topics: readonly GuideTopic[];
  labels: Dictionary["adminGuide"];
  role: AdminRole;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
      <section className="space-y-4" aria-label={labels.topicListAria}>
        <div>
          <h2 className="section-title">{labels.browseTitle}</h2>
          <p className="body-text mt-1 max-w-2xl">{labels.browseDescription}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {topics.map((topic) => {
            const Icon = getTopicIcon(topic.id);
            return (
              <Link
                key={topic.id}
                href={`/dashboard/guide?topic=${encodeURIComponent(topic.id)}`}
                className="group flex min-h-36 cursor-pointer flex-col justify-between rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-page))] p-4 transition-colors hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--bg-subtle))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--border-focus))]"
              >
                <div>
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-tertiary))] transition-colors group-hover:text-[hsl(var(--text-primary))]">
                    <Icon size={15} aria-hidden />
                  </div>
                  <h2 className="text-sm font-semibold text-[hsl(var(--text-primary))]">
                    {topic.title}
                  </h2>
                  <p className="mt-1.5 text-xs leading-5 text-[hsl(var(--text-tertiary))]">
                    {topic.summary}
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--text-secondary))]">
                  {labels.openTopic}
                  <ArrowRight size={11} aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="work-surface overflow-hidden p-0">
          <div className="border-b border-[hsl(var(--border-default))] px-5 py-4">
            <p className="kicker">{labels.quickLinks.title}</p>
          </div>
          <div className="flex flex-col gap-1 p-2">
            {labels.quickLinks.links.map((link) => {
              if (!isAllowed(role, link.roles)) return null;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex min-h-9 cursor-pointer items-center justify-between rounded px-3 py-2 text-xs font-medium text-[hsl(var(--text-secondary))] transition-colors hover:bg-[hsl(var(--bg-subtle))] hover:text-[hsl(var(--text-primary))]"
                >
                  {link.label}
                  <ArrowRight size={11} aria-hidden />
                </Link>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

function TopicDetail({
  topic,
  labels,
  role,
}: {
  topic: GuideTopic;
  labels: Dictionary["adminGuide"];
  role: AdminRole;
}) {
  const Icon = getTopicIcon(topic.id);
  const allowedActions = topic.actions.filter((action) =>
    isAllowed(role, action.roles),
  );

  return (
    <article className="space-y-5">
      <Link href="/dashboard/guide" className="btn-ghost btn-sm">
        <ArrowLeft size={12} aria-hidden />
        {labels.backToGuide}
      </Link>

      <div className="work-surface p-5">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-tertiary))]">
            <Icon size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="kicker mb-2">{labels.detailLabel}</p>
            <h2 className="section-title">{topic.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[hsl(var(--text-secondary))]">
              {topic.intro}
            </p>
          </div>
        </div>
      </div>

      {topic.steps.length > 0 ? (
        <section className="work-surface overflow-hidden p-0">
          <div className="border-b border-[hsl(var(--border-default))] px-5 py-4">
            <p className="kicker">{labels.stepsLabel}</p>
          </div>
          <ol className="divide-y divide-[hsl(var(--border-subtle))]">
            {topic.steps.map((step, index) => (
              <li key={step.title} className="flex gap-4 px-5 py-4">
                <span className="mt-0.5 w-5 shrink-0 font-mono text-[0.625rem] font-semibold text-[hsl(var(--text-quaternary))]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-sm font-medium text-[hsl(var(--text-primary))]">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-[hsl(var(--text-tertiary))]">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {topic.details.length > 0 ? (
        <section className="grid gap-3 md:grid-cols-2">
          {topic.details.map((detail) => (
            <div
              key={detail.title}
              className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-page))] p-4"
            >
              <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">
                {detail.title}
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-[hsl(var(--text-tertiary))]">
                {detail.body}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {topic.roleCards.length > 0 ? (
        <section className="work-surface overflow-hidden p-0">
          <div className="border-b border-[hsl(var(--border-default))] px-5 py-4">
            <p className="kicker">{labels.rolesLabel}</p>
          </div>
          <div className="divide-y divide-[hsl(var(--border-subtle))]">
            {topic.roleCards.map((item, index) => (
              <div key={item.role} className="px-5 py-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">
                    {item.role}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[0.625rem] font-semibold ${roleToneClass(index)}`}
                  >
                    {item.badge}
                  </span>
                </div>
                <p className="mb-3 text-xs leading-5 text-[hsl(var(--text-tertiary))]">
                  {item.body}
                </p>
                <ul className="space-y-1.5">
                  {item.permissions.map((permission) => (
                    <li key={permission} className="flex items-start gap-2">
                      <span
                        className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--text-quaternary))]"
                        aria-hidden
                      />
                      <span className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">
                        {permission}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {topic.notes.length > 0 ? (
        <section className="space-y-2">
          <p className="kicker">{labels.notesLabel}</p>
          {topic.notes.map((note) => (
            <div
              key={note.title}
              className="rounded-lg border border-[hsl(var(--status-warn-border))] bg-[hsl(var(--status-warn-bg))] px-4 py-3"
            >
              <h3 className="text-xs font-semibold text-[hsl(var(--status-warn-text))]">
                {note.title}
              </h3>
              <p className="mt-1 text-xs leading-5 text-[hsl(var(--status-warn-text))]">
                {note.body}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {allowedActions.length > 0 ? (
        <section className="flex flex-wrap gap-2">
          {allowedActions.map((action) => (
            <Link key={action.href} href={action.href} className="btn-ghost btn-sm">
              {action.label}
              <ArrowRight size={11} aria-hidden />
            </Link>
          ))}
        </section>
      ) : null}
    </article>
  );
}
