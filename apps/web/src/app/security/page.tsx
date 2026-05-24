import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Security — Certiva",
  description:
    "How Certiva protects public verification flows and credential proof integrity through cryptographic hashing, blockchain anchoring, and read-only public access.",
};

const principles = [
  {
    kicker: "Access model",
    title: "Public verification is read-only",
    body: "Any party can look up a credential or check a document hash using the public interface. No account is required, and no write access is available through the public tools. Credential issuance, revocation, and registry management are restricted to authenticated institutional workspaces.",
  },
  {
    kicker: "Document integrity",
    title: "SHA-256 hash comparison",
    body: "Document Check computes the SHA-256 hash of the uploaded file in-memory and compares it against the registered proof record. The uploaded file is not stored. A match confirms the file bytes are identical to those registered at issuance time.",
  },
  {
    kicker: "Credential proof",
    title: "Registry-backed credential records",
    body: "Credential records are controlled by the issuing institution. Each record carries issuer identity, recipient details, credential metadata, status (active or revoked), and a proof state. Revocation is real-time — a revoked credential returns Revoked immediately on the next lookup.",
  },
  {
    kicker: "Blockchain anchoring",
    title: "On-chain audit layer",
    body: "Credential hashes are anchored on the Polygon Amoy network at issuance. This creates a tamper-evident, time-stamped entry independent of Certiva's infrastructure. The blockchain is a secondary audit layer — the registry is the primary source of record status.",
  },
  {
    kicker: "Proof separation",
    title: "Credential validity vs. document integrity",
    body: "Credential Check and Document Check are independent verification paths. A valid credential registry record does not imply the associated PDF is unmodified. A matching document hash does not confirm the credential is still active. Use both checks where completeness matters.",
  },
  {
    kicker: "Public identifiers",
    title: "Verification IDs are public",
    body: "Verification IDs are intentionally public identifiers. Possessing a verification ID grants anyone the ability to look up that credential's status. This is by design — it enables relying parties to verify credentials independently without contacting the institution.",
  },
] as const;

const hardening = [
  {
    area: "Transport",
    items: [
      "Deploy over HTTPS only. HTTP access should be disabled or redirect to HTTPS.",
      "Use a valid TLS certificate from a trusted CA. Avoid self-signed certificates in production.",
    ],
  },
  {
    area: "Secrets management",
    items: [
      "Store all credentials, API keys, and signing secrets in environment variables — never in source code.",
      "Rotate secrets regularly and audit access to environment configuration.",
    ],
  },
  {
    area: "Access control",
    items: [
      "Restrict institutional workspace access to authorised administrators only.",
      "Enforce strong authentication for all workspace logins.",
    ],
  },
  {
    area: "Rate limiting",
    items: [
      "Apply rate limiting to all public verification endpoints to prevent enumeration and abuse.",
      "Consider IP-based throttling for the document upload endpoint.",
    ],
  },
  {
    area: "Audit logging",
    items: [
      "Log all administrative actions in the institution workspace with timestamps and actor identity.",
      "Retain logs sufficient for audit and incident response.",
    ],
  },
  {
    area: "Data backup",
    items: [
      "Back up the credential registry database regularly.",
      "Test restoration procedures independently of the primary deployment.",
    ],
  },
] as const;

const disclosures = [
  "Certiva does not store or log the identity of parties performing public verification lookups.",
  "Verification IDs are public identifiers. Sharing a verification ID allows any party to look up that credential's status.",
  "Certiva does not provide legal authentication of academic credentials. Results are informational and should be used alongside institutional confirmation where legal proof is required.",
  "The blockchain proof layer currently uses Polygon Amoy, a public test network. Anchoring behaviour and proof permanence may vary by deployment configuration.",
  "Document uploads for hash comparison are processed in-memory and are not stored by the platform unless the deployment is explicitly configured otherwise.",
] as const;

export default function SecurityPage() {
  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />

      <div className="mx-auto max-w-300 px-6 sm:px-8">
        {/* Page header */}
        <div className="border-b border-[hsl(var(--border-default))] py-12 md:py-14">
          <p className="kicker mb-3">Platform</p>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] leading-[1.08] md:text-[2.5rem]">
            Security
          </h1>
          <p className="mt-3 max-w-[52ch] text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
            How Certiva protects public verification flows and credential proof integrity. Covers the access model, cryptographic proof chain, and recommended deployment practices.
          </p>
        </div>

        {/* Security principles */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-8">Security model</p>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--border-default))] md:grid-cols-2">
            {principles.map(({ kicker, title, body }) => (
              <div key={title} className="bg-[hsl(var(--bg-base))] px-7 py-7">
                <p className="kicker mb-3">{kicker}</p>
                <h2 className="mb-2.5 text-[0.9375rem] font-semibold tracking-tight">
                  {title}
                </h2>
                <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Deployment hardening */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <div className="md:flex md:items-start md:gap-16">
            <div className="mb-8 shrink-0 md:mb-0 md:w-52">
              <p className="kicker mb-2">Deployment</p>
              <p className="text-[0.8125rem] leading-[1.6] text-[hsl(var(--text-secondary))]">
                Recommended hardening practices for production Certiva deployments. These are operational expectations, not verified certifications.
              </p>
            </div>
            <div className="flex-1 divide-y divide-[hsl(var(--border-subtle))] overflow-hidden rounded-xl border border-[hsl(var(--border-default))]">
              {hardening.map(({ area, items }) => (
                <div key={area} className="bg-[hsl(var(--bg-base))] px-6 py-5">
                  <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[hsl(var(--text-tertiary))]">
                    {area}
                  </p>
                  <ul className="space-y-2">
                    {items.map((item) => (
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
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Disclosures */}
        <div className="py-10 md:py-12">
          <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-7 py-7">
            <p className="kicker mb-5">Disclosure notes</p>
            <ul className="space-y-3.5">
              {disclosures.map((note) => (
                <li key={note} className="flex items-start gap-3">
                  <span
                    className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--border-strong))]"
                    aria-hidden
                  />
                  <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">
                    {note}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-[hsl(var(--border-subtle))] pt-5">
              <p className="text-[0.8125rem] leading-[1.6] text-[hsl(var(--text-tertiary))]">
                Questions about security practices or to report a concern?{" "}
                <Link
                  href="/contact"
                  className="text-[hsl(var(--text-secondary))] underline underline-offset-3 decoration-[hsl(var(--border-strong))] hover:decoration-[hsl(var(--text-secondary))] transition-colors duration-150"
                >
                  Contact us
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
