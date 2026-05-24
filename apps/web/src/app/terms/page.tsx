import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms governing use of Certiva's public credential and document verification tools.",
};

type Section = { heading: string; body: string | null; isContact?: boolean };

const sections: Section[] = [
  {
    heading: "Scope",
    body: "These terms apply to the public-facing verification tools provided through this Certiva deployment, including Credential Check and Document Check. Use of these tools constitutes acceptance of these terms. These terms do not apply to institutional workspace access, which is governed separately.",
  },
  {
    heading: "Permitted use",
    body: "You may use Certiva's public verification tools to verify the status of a specific academic credential, to check whether a PDF file matches a registered proof record, and to review verification results for the purpose of assessing document or credential authenticity. Use must be for legitimate verification purposes only.",
  },
  {
    heading: "Prohibited use",
    body: "You may not use Certiva's public verification tools to systematically enumerate or harvest credential records, to attempt to identify registry structure or discover unrelated credentials, to misrepresent, alter, or selectively present verification results to any third party, to interfere with platform availability or attempt to bypass access controls, or to use the platform in any manner that constitutes abuse, fraud, or violation of applicable law.",
  },
  {
    heading: "Verification limitations",
    body: "Verification results reflect the state of the registry at the time of the lookup. Certiva does not guarantee that results constitute legal proof of academic qualification. Credential Check and Document Check are independent — a valid credential does not confirm document integrity, and a matching document hash does not confirm credential validity. Blockchain proof in this deployment uses a public test network and should not be treated as equivalent to mainnet production evidence.",
  },
  {
    heading: "No academic decision guarantee",
    body: "Certiva provides verification infrastructure. The results of credential or document checks are informational only. Final decisions regarding academic admission, employment, scholarship eligibility, or professional recognition rest with the relying party or issuing institution. Certiva bears no responsibility for decisions made in reliance on verification output.",
  },
  {
    heading: "Institution records",
    body: "The accuracy, completeness, and currency of credential records are the responsibility of the issuing institution. Certiva does not independently validate institution-submitted data. To correct or dispute an official academic record, contact the issuing institution directly.",
  },
  {
    heading: "No warranties",
    body: "Certiva's public verification tools are provided as-is. No warranties, express or implied, are made regarding uninterrupted availability, accuracy of results, or fitness for any particular purpose. Public verification may be unavailable due to maintenance, deployment configuration changes, or network conditions.",
  },
  {
    heading: "Limitation of liability",
    body: "To the maximum extent permitted by applicable law, Certiva is not liable for any indirect, incidental, or consequential damages arising from use of, or inability to use, the public verification tools — including reliance on a verification result that later proves incorrect or incomplete.",
  },
  {
    heading: "Changes to these terms",
    body: "These terms may be updated at any time. Continued use of the public verification tools after a change constitutes acceptance of the updated terms.",
  },
  {
    heading: "Governing law",
    body: "These terms are governed by applicable law in the jurisdiction of the platform operator. Specific jurisdictional provisions will be finalised prior to production deployment.",
  },
  {
    heading: "Contact",
    body: null,
    isContact: true,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />

      <div className="mx-auto max-w-300 px-6 sm:px-8">
        {/* Page header */}
        <div className="border-b border-[hsl(var(--border-default))] py-12 md:py-14">
          <p className="kicker mb-3">Legal</p>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] leading-[1.08] md:text-[2.5rem]">
            Terms of Use
          </h1>
          <p className="mt-3 max-w-[52ch] text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
            Terms governing use of Certiva's public credential and document verification tools.
          </p>
          <div className="mt-5 inline-flex items-center rounded-md border border-[hsl(var(--status-warn-border))] bg-[hsl(var(--status-warn-bg))] px-3 py-1.5">
            <p className="text-[0.75rem] leading-normal text-[hsl(var(--status-warn-text))]">
              Operational draft — legal review required before production deployment.
            </p>
          </div>
        </div>

        {/* Terms sections */}
        <div className="divide-y divide-[hsl(var(--border-subtle))] py-4">
          {sections.map(({ heading, body, isContact }) => (
            <div
              key={heading}
              className="grid gap-4 py-8 md:grid-cols-[220px_1fr] md:gap-12"
            >
              <h2 className="text-[0.8125rem] font-semibold tracking-tight text-[hsl(var(--text-primary))]">
                {heading}
              </h2>
              {isContact ? (
                <p className="text-sm leading-[1.75] text-[hsl(var(--text-secondary))]">
                  For questions about these terms or about verification results,{" "}
                  <Link
                    href="/contact"
                    className="text-[hsl(var(--text-primary))] underline underline-offset-3 decoration-[hsl(var(--border-strong))] hover:decoration-[hsl(var(--text-primary))] transition-colors duration-150"
                  >
                    contact us
                  </Link>
                  .
                </p>
              ) : (
                <p className="text-sm leading-[1.75] text-[hsl(var(--text-secondary))]">
                  {body}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Revision note */}
        <div className="pb-10 pt-2">
          <p className="text-[0.6875rem] text-[hsl(var(--text-quaternary))]">
            Last revised: 2026. Operational draft — pending final legal review.
          </p>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
