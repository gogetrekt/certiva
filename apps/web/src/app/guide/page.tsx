import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  IdentificationCardIcon,
  FilePdfIcon,
  CheckCircleIcon,
  XCircleIcon,
  WarningIcon,
  ClockIcon,
  QuestionIcon,
  MinusIcon,
} from "@phosphor-icons/react/dist/ssr";

import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { getServerDictionary } from "../../lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();

  return {
    title: t.footer.verificationGuide,
    description: t.metadata.guideDescription,
  };
}

const checkTypeConfig = [
  {
    icon: IdentificationCardIcon,
    href: "/verify",
  },
  {
    icon: FilePdfIcon,
    href: "/verify/document",
  },
] as const;

const resultStateConfig = [
  {
    icon: CheckCircleIcon,
    colorClass: "text-[hsl(var(--status-valid-dot))]",
    bgClass: "bg-[hsl(var(--status-valid-bg))]",
    borderClass: "border-[hsl(var(--status-valid-border))]",
  },
  {
    icon: XCircleIcon,
    colorClass: "text-[hsl(var(--status-error-dot))]",
    bgClass: "bg-[hsl(var(--status-error-bg))]",
    borderClass: "border-[hsl(var(--status-error-border))]",
  },
  {
    icon: QuestionIcon,
    colorClass: "text-[hsl(var(--text-tertiary))]",
    bgClass: "bg-[hsl(var(--bg-subtle))]",
    borderClass: "border-[hsl(var(--border-default))]",
  },
  {
    icon: WarningIcon,
    colorClass: "text-[hsl(var(--status-warn-dot))]",
    bgClass: "bg-[hsl(var(--status-warn-bg))]",
    borderClass: "border-[hsl(var(--status-warn-border))]",
  },
  {
    icon: ClockIcon,
    colorClass: "text-[hsl(var(--status-warn-dot))]",
    bgClass: "bg-[hsl(var(--status-warn-bg))]",
    borderClass: "border-[hsl(var(--status-warn-border))]",
  },
  {
    icon: MinusIcon,
    colorClass: "text-[hsl(var(--text-tertiary))]",
    bgClass: "bg-[hsl(var(--bg-subtle))]",
    borderClass: "border-[hsl(var(--border-default))]",
  },
] as const;

export default async function GuidePage() {
  const t = await getServerDictionary();

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />

      <div className="mx-auto max-w-300 px-6 sm:px-8">
        {/* Page header */}
        <div className="border-b border-[hsl(var(--border-default))] py-12 md:py-14">
          <p className="kicker mb-3">{t.guide.kicker}</p>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] leading-[1.08] md:text-[2.5rem]">
            {t.guide.title}
          </h1>
          <p className="mt-3 max-w-[52ch] text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
            {t.guide.intro}
          </p>
        </div>

        {/* Choose the right check */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-8">{t.guide.chooseCheck}</p>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--border-default))] md:grid-cols-2">
            {t.guide.checkTypes.map(({ kicker, title, body, when, cta }, index) => {
              const { icon: Icon, href } = checkTypeConfig[index];

              return (
              <div key={kicker} className="flex flex-col gap-5 bg-[hsl(var(--bg-base))] px-7 py-7">
                <div>
                  <div className="mb-4 flex items-center gap-2.5">
                    <Icon
                      size={18}
                      weight="duotone"
                      className="text-[hsl(var(--text-primary))]"
                      aria-hidden
                    />
                    <p className="kicker">{kicker}</p>
                  </div>
                  <h2 className="mb-2.5 text-[0.9375rem] font-semibold tracking-tight">
                    {title}
                  </h2>
                  <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">
                    {body}
                  </p>
                </div>
                <div className="rounded-lg border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-subtle))] px-4 py-4">
                  <p className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[hsl(var(--text-tertiary))]">
                    {t.guide.useWhen}
                  </p>
                  <ul className="space-y-2">
                    {when.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span
                          className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--border-strong))]"
                          aria-hidden
                        />
                        <span className="text-[0.8125rem] leading-[1.6] text-[hsl(var(--text-secondary))]">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Link href={href} className="btn-ghost btn-sm">
                    {cta}
                    <ArrowRightIcon size={12} weight="bold" aria-hidden />
                  </Link>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Validity vs integrity */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-8">{t.guide.validityVsIntegrity}</p>
          <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] px-7 py-7">
            <div className="grid gap-8 md:grid-cols-2 md:gap-10">
              <div>
                <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[hsl(var(--text-tertiary))]">
                  {t.guide.credentialValidity}
                </p>
                <h3 className="mb-3 text-[0.9375rem] font-semibold tracking-tight">
                  {t.guide.registryBackedStatus}
                </h3>
                <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">
                  {t.guide.credentialValidityBody}
                </p>
              </div>
              <div>
                <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[hsl(var(--text-tertiary))]">
                  {t.guide.documentIntegrity}
                </p>
                <h3 className="mb-3 text-[0.9375rem] font-semibold tracking-tight">
                  {t.guide.fileHashMatch}
                </h3>
                <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">
                  {t.guide.documentIntegrityBody}
                </p>
              </div>
            </div>
            <div className="mt-7 rounded-lg border border-[hsl(var(--status-warn-border))] bg-[hsl(var(--status-warn-bg))] px-4 py-3.5">
              <p className="text-[0.8125rem] leading-[1.6] text-[hsl(var(--status-warn-text))]">
                {t.guide.warning}
              </p>
            </div>
          </div>
        </div>

        {/* Result states */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-8">{t.guide.possibleResults}</p>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--border-default))] md:grid-cols-2">
            {t.guide.resultStates.map(({ label, applies, meaning }, index) => {
              const { icon: Icon, colorClass, bgClass, borderClass } =
                resultStateConfig[index];

              return (
              <div key={label} className="bg-[hsl(var(--bg-base))] px-7 py-6">
                <div className="mb-3 flex items-center gap-2">
                  <div className={`inline-flex items-center gap-1.5 rounded-md border ${borderClass} ${bgClass} px-2 py-1`}>
                    <Icon size={12} weight="fill" className={colorClass} aria-hidden />
                    <span className={`text-[0.625rem] font-semibold uppercase tracking-[0.07em] ${colorClass}`}>
                      {label}
                    </span>
                  </div>
                  <span className="text-[0.625rem] font-medium uppercase tracking-[0.07em] text-[hsl(var(--text-quaternary))]">
                    {applies}
                  </span>
                </div>
                <p className="text-[0.8125rem] leading-[1.65] text-[hsl(var(--text-secondary))]">
                  {meaning}
                </p>
              </div>
              );
            })}
          </div>
        </div>

        {/* Workflow */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-8">{t.guide.workflow}</p>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--border-default))] md:grid-cols-2">
            {t.guide.workflowSteps.map(({ step, title, body }, i) => (
              <div
                key={step}
                className={`bg-[hsl(var(--bg-base))] px-7 py-7${i === t.guide.workflowSteps.length - 1 && t.guide.workflowSteps.length % 2 !== 0 ? " md:col-span-2" : ""}`}
              >
                <p className="mb-4 font-mono text-[0.6875rem] text-[hsl(var(--text-quaternary))]">
                  {step}
                </p>
                <h3 className="mb-2 text-[0.9375rem] font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Limitations */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-8">{t.guide.limitations}</p>
          <div className="divide-y divide-[hsl(var(--border-subtle))] overflow-hidden rounded-xl border border-[hsl(var(--border-default))]">
            {t.guide.limitationItems.map(({ title, body }) => (
              <div key={title} className="grid gap-3 bg-[hsl(var(--bg-base))] px-7 py-6 md:grid-cols-[200px_1fr] md:gap-10">
                <h3 className="text-[0.8125rem] font-semibold tracking-tight text-[hsl(var(--text-primary))]">
                  {title}
                </h3>
                <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA row */}
        <div className="flex flex-wrap items-center gap-3 py-10">
          <Link href="/verify" className="btn-primary">
            {t.nav.credentialCheck}
            <ArrowRightIcon size={13} weight="bold" aria-hidden />
          </Link>
          <Link href="/verify/document" className="btn-ghost">
            {t.nav.documentCheck}
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
