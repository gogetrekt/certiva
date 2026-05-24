import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How this Certiva deployment handles information during public credential verification and document integrity checks.",
};

type Section = { heading: string; body: string | null; isContact?: boolean };

const sections: Section[] = [
  {
    heading: "Information processed during public verification",
    body: "When you use Credential Check, Certiva processes the verification ID you submit to query the registry and return a result. No account, name, or contact information is collected from relying parties. Certiva does not log the identity of parties performing public lookups. Basic technical request metadata — such as timestamps and response codes — may be retained for security monitoring and abuse prevention.",
  },
  {
    heading: "Document uploads",
    body: "When you use Document Check, the uploaded PDF is processed in-memory to compute a SHA-256 hash. That hash is compared against the registered proof record. The file itself is not stored by the platform. If you are deploying Certiva in a context where file storage behaviour differs, this section should be updated to reflect the actual implementation before publication.",
  },
  {
    heading: "Credential records",
    body: "Credential records stored in the Certiva registry are submitted by issuing institutions at issuance time. A record may include recipient name, institution name, degree or program, issue date, credential status, and proof metadata. Certiva does not independently collect student or recipient data — it stores what the issuing institution provides and returns it in response to verification lookups.",
  },
  {
    heading: "How information is used",
    body: "Submitted verification IDs and document hashes are used solely to return a verification result. No data collected during public verification is used for advertising, profiling, or sale. Request logs, where retained, are used for security monitoring, rate-limit enforcement, and abuse detection.",
  },
  {
    heading: "Browser storage",
    body: "Certiva uses browser local storage to persist your theme preference (light or dark mode). No tracking cookies, advertising cookies, session identifiers, or cross-site identifiers are used.",
  },
  {
    heading: "Blockchain anchoring",
    body: "Credential hash anchoring uses the Polygon Amoy public blockchain network. When a credential hash is anchored, that hash becomes publicly visible on-chain. No personally identifying information is included in on-chain data — only a cryptographic fingerprint of the credential.",
  },
  {
    heading: "Data sharing",
    body: "Certiva does not sell personal data. Credential data is not used for advertising purposes. Infrastructure and hosting providers may process data as part of operating the deployment. The issuing institution controls the accuracy, completeness, and retention of credential records it has submitted.",
  },
  {
    heading: "Data retention",
    body: "Credential registry records are retained for as long as the issuing institution maintains their Certiva deployment. Institutions are responsible for their own retention policies in accordance with applicable law. Request logs may be retained for security and abuse prevention purposes depending on deployment configuration. Uploaded documents are not retained unless the deployment is explicitly configured otherwise.",
  },
  {
    heading: "Institution responsibility",
    body: "Each deploying institution is responsible for the accuracy, legality, and completeness of the credential records it issues through Certiva. Corrections to official academic records must be made by the issuing institution. Certiva does not independently audit or validate the accuracy of institution-submitted data.",
  },
  {
    heading: "Contact",
    body: null,
    isContact: true,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />

      <div className="mx-auto max-w-300 px-6 sm:px-8">
        {/* Page header */}
        <div className="border-b border-[hsl(var(--border-default))] py-12 md:py-14">
          <p className="kicker mb-3">Legal</p>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] leading-[1.08] md:text-[2.5rem]">
            Privacy Policy
          </h1>
          <p className="mt-3 max-w-[52ch] text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
            How this Certiva deployment handles information during public credential verification and document integrity checks.
          </p>
          <div className="mt-5 inline-flex items-center rounded-md border border-[hsl(var(--status-warn-border))] bg-[hsl(var(--status-warn-bg))] px-3 py-1.5">
            <p className="text-[0.75rem] leading-normal text-[hsl(var(--status-warn-text))]">
              Operational draft — legal review required before production deployment.
            </p>
          </div>
        </div>

        {/* Policy sections */}
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
                  Questions about these privacy practices may be directed to the institution that issued the credential, or for platform-level enquiries, use the{" "}
                  <Link
                    href="/contact"
                    className="text-[hsl(var(--text-primary))] underline underline-offset-3 decoration-[hsl(var(--border-strong))] hover:decoration-[hsl(var(--text-primary))] transition-colors duration-150"
                  >
                    Certiva contact page
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
