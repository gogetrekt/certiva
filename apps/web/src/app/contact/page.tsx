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

export const metadata: Metadata = {
  title: "Contact — Certiva",
  description:
    "Get in touch with questions about Certiva's public credential and document verification tools, or about institutional access.",
};

const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "gogetrekt@archivecircle.xyz";

const categories = [
  {
    icon: IdentificationCardIcon,
    kicker: "Verification questions",
    title: "Credential result issues",
    body: "If a verification ID returns no result, confirm the ID is copied exactly as printed on the credential — including any hyphens or separators. A Not Found result may mean the ID is incorrect, the credential was issued outside this deployment, or the record has been removed by the institution.",
    prepare: [
      "The verification ID exactly as shown on the credential",
      "The institution name printed on the credential",
      "The result state you received (Valid, Revoked, Not Found, etc.)",
      "A screenshot of the full result page",
    ],
    action: null,
  },
  {
    icon: FilePdfIcon,
    kicker: "Document integrity",
    title: "Document hash mismatch",
    body: "A Mismatch result means the uploaded file's bytes differ from those registered at proof time. The most common reason is that the file was re-exported, compressed, watermarked, or otherwise modified after issuance. Contact the issuing institution to obtain an unmodified copy of the original file.",
    prepare: [
      "The credential's verification ID",
      "Confirmation that the PDF has not been modified, printed, or re-scanned",
      "The source of the file (email attachment, institution portal, etc.)",
    ],
    action: null,
  },
  {
    icon: BuildingsIcon,
    kicker: "Institution access",
    title: "Institutional administrators",
    body: "If you are an institution administrator with questions about credential issuance, registry configuration, workspace access, or Certiva deployment, sign in to your workspace. For deployment and integration questions, use the platform contact below.",
    prepare: null,
    action: { label: "Sign In", href: "/login" },
  },
  {
    icon: WrenchIcon,
    kicker: "Platform issues",
    title: "Technical and platform issues",
    body: "For technical issues with the public verification interface — including unexpected errors, incorrect results, or service availability problems — use the platform contact address below. Describe the issue, the verification ID if applicable, and any error messages shown.",
    prepare: [
      "The page or tool where the issue occurred",
      "The verification ID if applicable",
      "The exact error message or unexpected result",
      "Your browser and approximate time of the issue",
    ],
    action: null,
  },
] as const;

const beforeContacting = [
  "Ensure the verification ID is copied exactly — a single incorrect character will return Not Found.",
  "For document issues, confirm the PDF is the original issued file and has not been modified.",
  "Check that you are using Credential Check and Document Check as separate tools — they verify different things.",
  "Review the Verification Guide for an explanation of each result state before contacting.",
] as const;

export default function ContactPage() {
  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />

      <div className="mx-auto max-w-300 px-6 sm:px-8">
        {/* Page header */}
        <div className="border-b border-[hsl(var(--border-default))] py-12 md:py-14">
          <p className="kicker mb-3">Support</p>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] leading-[1.08] md:text-[2.5rem]">
            Contact
          </h1>
          <p className="mt-3 max-w-[52ch] text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
            For questions about public verification results, document integrity checks, or institutional access. Only the issuing institution can correct or confirm official academic records.
          </p>
        </div>

        {/* Before contacting */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-6">Before contacting</p>
          <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] px-7 py-6">
            <p className="mb-4 text-[0.8125rem] font-semibold tracking-tight">
              Most issues can be resolved without contacting support
            </p>
            <ul className="space-y-3">
              {beforeContacting.map((item) => (
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
                Read the Verification Guide
                <ArrowRightIcon size={12} weight="bold" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        {/* Category grid */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-8">What to contact us about</p>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--border-default))] md:grid-cols-2">
            {categories.map(({ icon: Icon, kicker, title, body, prepare, action }) => (
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
                      Have ready
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
                    <Link href={action.href} className="btn-ghost btn-sm">
                      {action.label}
                      <ArrowRightIcon size={12} weight="bold" aria-hidden />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Direct contact */}
        <div className="py-10 md:py-12">
          <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] px-7 py-7 md:flex md:items-start md:justify-between md:gap-12">
            <div className="max-w-lg">
              <p className="kicker mb-3">Platform contact</p>
              <h2 className="mb-2 text-[0.9375rem] font-semibold tracking-tight">
                Technical and platform enquiries
              </h2>
              <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">
                For technical issues or deployment questions, reach out via the address below. Certiva can help interpret verification output and troubleshoot platform behaviour. Only the issuing institution can confirm, correct, or reissue official academic records.
              </p>
            </div>
            <div className="mt-6 shrink-0 md:mt-0">
              <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[hsl(var(--text-tertiary))]">
                Email
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
                  Support contact not configured for this deployment.
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
