import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  IdentificationCardIcon,
  FilePdfIcon,
  BuildingsIcon,
  WrenchIcon,
} from "@phosphor-icons/react/dist/ssr";

import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { getServerDictionary } from "../../lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();

  return {
    title: t.footer.contact,
    description: t.metadata.contactDescription,
  };
}

const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "gogetrekt@archivecircle.xyz";

const categoryConfig = [
  {
    icon: IdentificationCardIcon,
    actionHref: undefined,
  },
  {
    icon: FilePdfIcon,
    actionHref: undefined,
  },
  {
    icon: BuildingsIcon,
    actionHref: "/login",
  },
  {
    icon: WrenchIcon,
    actionHref: undefined,
  },
] as const;

export default async function ContactPage() {
  const t = await getServerDictionary();

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />

      <div className="mx-auto max-w-300 px-6 sm:px-8">
        {/* Page header */}
        <div className="border-b border-[hsl(var(--border-default))] py-12 md:py-14">
          <p className="kicker mb-3">{t.contact.kicker}</p>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] leading-[1.08] md:text-[2.5rem]">
            {t.contact.title}
          </h1>
          <p className="mt-3 max-w-[52ch] text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
            {t.contact.intro}
          </p>
        </div>

        {/* Before contacting */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-6">{t.contact.before}</p>
          <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] px-7 py-6">
            <p className="mb-4 text-[0.8125rem] font-semibold tracking-tight">
              {t.contact.beforeTitle}
            </p>
            <ul className="space-y-3">
              {t.contact.beforeItems.map((item) => (
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
            <div className="mt-5">
              <Link
                href="/guide"
                className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[hsl(var(--text-primary))] underline underline-offset-3 decoration-[hsl(var(--border-strong))] hover:decoration-[hsl(var(--text-primary))] transition-colors duration-150"
              >
                {t.contact.readGuide}
                <ArrowRightIcon size={12} weight="bold" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        {/* Category grid */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-8">{t.contact.whatToContact}</p>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--border-default))] md:grid-cols-2">
            {t.contact.categories.map(({ kicker, title, body, prepare, action }, index) => {
              const { icon: Icon, actionHref } = categoryConfig[index];

              return (
              <div key={title} className="flex flex-col gap-5 bg-[hsl(var(--bg-base))] px-7 py-7">
                <div>
                  <div className="mb-4 flex items-center gap-2.5">
                    <Icon
                      size={16}
                      weight="duotone"
                      className="text-[hsl(var(--text-secondary))]"
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
                {prepare && (
                  <div className="rounded-lg border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-subtle))] px-4 py-4">
                    <p className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[hsl(var(--text-tertiary))]">
                      {t.contact.haveReady}
                    </p>
                    <ul className="space-y-2">
                      {prepare.map((item) => (
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
                )}
                {action && (
                  <div>
                    <Link href={actionHref ?? "/login"} className="btn-ghost btn-sm">
                      {action}
                      <ArrowRightIcon size={12} weight="bold" aria-hidden />
                    </Link>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>

        {/* Direct contact */}
        <div className="py-10 md:py-12">
          <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] px-7 py-7 md:flex md:items-start md:justify-between md:gap-12">
            <div className="max-w-lg">
              <p className="kicker mb-3">{t.contact.platformContact}</p>
              <h2 className="mb-2 text-[0.9375rem] font-semibold tracking-tight">
                {t.contact.enquiries}
              </h2>
              <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">
                {t.contact.enquiriesBody}
              </p>
            </div>
            <div className="mt-6 shrink-0 md:mt-0">
              <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[hsl(var(--text-tertiary))]">
                {t.common.email}
              </p>
              {supportEmail ? (
                <a
                  href={`mailto:${supportEmail}`}
                  className="font-mono text-[0.8125rem] text-[hsl(var(--text-primary))] underline underline-offset-3 decoration-[hsl(var(--border-strong))] hover:decoration-[hsl(var(--text-primary))] transition-colors duration-150"
                >
                  {supportEmail}
                </a>
              ) : (
                <p className="text-[0.8125rem] italic text-[hsl(var(--text-tertiary))]">
                  {t.common.supportNotConfigured}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
