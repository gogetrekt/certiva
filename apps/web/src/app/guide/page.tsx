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

export const metadata: Metadata = {
  title: "Verification Guide",
  description:
    "Learn how to verify academic credentials and check document integrity using Certiva's public verification tools.",
};

const checkTypes = [
  {
    icon: IdentificationCardIcon,
    kicker: "Credential Check",
    title: "Verify a credential record",
    body: "Use when you have a verification ID, the unique public identifier printed on the credential or embedded in its QR code. Returns the registry record: recipient name, issuing institution, degree or program, issue date, credential status, and blockchain proof state.",
    when: [
      "Confirming whether an academic credential is active or revoked",
      "Identifying the issuing institution and recipient",
      "Checking whether a proof has been anchored on-chain",
    ],
    cta: { label: "Credential Check", href: "/verify" },
  },
  {
    icon: FilePdfIcon,
    kicker: "Document Check",
    title: "Verify a PDF file's integrity",
    body: "Use when you have the original credential PDF file. Certiva computes the SHA-256 hash of the uploaded file and compares it against the registered proof record. A match confirms the file bytes are identical to those registered at issuance.",
    when: [
      "Confirming a PDF has not been altered since it was issued",
      "Detecting modifications to document content, layout, or metadata",
      "Running a file integrity check independent of the credential registry",
    ],
    cta: { label: "Document Check", href: "/verify/document" },
  },
] as const;

const resultStates = [
  {
    icon: CheckCircleIcon,
    colorClass: "text-[hsl(var(--status-valid-dot))]",
    bgClass: "bg-[hsl(var(--status-valid-bg))]",
    borderClass: "border-[hsl(var(--status-valid-border))]",
    label: "Valid",
    applies: "Credential Check",
    meaning:
      "The credential record exists in the registry, the issuing institution record is active, and the credential has not been revoked. No issues were found at the time of lookup.",
  },
  {
    icon: XCircleIcon,
    colorClass: "text-[hsl(var(--status-error-dot))]",
    bgClass: "bg-[hsl(var(--status-error-bg))]",
    borderClass: "border-[hsl(var(--status-error-border))]",
    label: "Revoked",
    applies: "Credential Check",
    meaning:
      "The credential exists in the registry but has been revoked by the issuing institution. A revoked credential should not be treated as current evidence of qualification.",
  },
  {
    icon: QuestionIcon,
    colorClass: "text-[hsl(var(--text-tertiary))]",
    bgClass: "bg-[hsl(var(--bg-subtle))]",
    borderClass: "border-[hsl(var(--border-default))]",
    label: "Not Found",
    applies: "Credential Check",
    meaning:
      "No record matching the submitted verification ID was found in the registry. This may indicate an incorrect ID, a credential issued outside this deployment, or a record that has been removed.",
  },
  {
    icon: WarningIcon,
    colorClass: "text-[hsl(var(--status-warn-dot))]",
    bgClass: "bg-[hsl(var(--status-warn-bg))]",
    borderClass: "border-[hsl(var(--status-warn-border))]",
    label: "Mismatch",
    applies: "Document Check",
    meaning:
      "The uploaded file's SHA-256 hash does not match the registered proof record. The file has been altered since it was issued, or a different version of the document was uploaded.",
  },
  {
    icon: ClockIcon,
    colorClass: "text-[hsl(var(--status-warn-dot))]",
    bgClass: "bg-[hsl(var(--status-warn-bg))]",
    borderClass: "border-[hsl(var(--status-warn-border))]",
    label: "Pending Anchor",
    applies: "Credential Check",
    meaning:
      "The credential record exists and is active, but the blockchain anchoring transaction has not yet been confirmed. The registry record is valid; only the on-chain proof layer is pending.",
  },
  {
    icon: MinusIcon,
    colorClass: "text-[hsl(var(--text-tertiary))]",
    bgClass: "bg-[hsl(var(--bg-subtle))]",
    borderClass: "border-[hsl(var(--border-default))]",
    label: "Proof Unavailable",
    applies: "Credential Check",
    meaning:
      "The credential record exists but no blockchain proof is available. Anchoring may not have been configured for this credential or deployment. Treat the registry record as the authoritative source.",
  },
] as const;

const workflowSteps = [
  {
    step: "01",
    title: "Locate the verification ID",
    body: "Find the verification ID on the credential document, typically printed as a short alphanumeric string or encoded in the QR code. Copy it exactly as shown, including any hyphens or separators.",
  },
  {
    step: "02",
    title: "Run Credential Check",
    body: "Navigate to Credential Check and enter the verification ID. The registry lookup is real-time. A result is returned immediately if the record exists.",
  },
  {
    step: "03",
    title: "Review the credential record",
    body: "Confirm the recipient name, issuing institution, degree or program, and issue date match the presented credential. Check the status (valid or revoked) and note the proof state.",
  },
  {
    step: "04",
    title: "Run Document Check if a PDF is available",
    body: "If the credential was presented as a PDF file, upload the file to Document Check. This confirms the file has not been altered since the proof was registered. A hash match means the document is intact.",
  },
  {
    step: "05",
    title: "Compare result with the presented document",
    body: "Verify that the name, institution, and credential details shown in Credential Check match those printed on the physical or digital document. Discrepancies between the registry record and the presented document warrant closer review.",
  },
] as const;

const limitations = [
  {
    title: "Records are institution-controlled",
    body: "Public verification results depend entirely on records submitted by the issuing institution. Certiva does not independently validate the accuracy of credential data; it only confirms whether a record exists and its current status.",
  },
  {
    title: "Document integrity is not credential validity",
    body: "A hash match on Document Check confirms the file has not been altered. It does not confirm the credential is valid, active, or unrevoked. Run Credential Check to confirm registry status.",
  },
  {
    title: "Blockchain proof may be pending",
    body: "On-chain anchoring can take time depending on network conditions and deployment configuration. A Pending Anchor result does not invalidate the credential; the registry record remains authoritative.",
  },
  {
    title: "Testnet anchoring",
    body: "Blockchain proof in this deployment uses Polygon Amoy, a public test network. Testnet proof should not be treated as equivalent to mainnet production evidence in contexts requiring legal or auditable chain-of-custody.",
  },
  {
    title: "No identity verification",
    body: "Certiva verifies credential records and document integrity. It does not verify the identity of the person presenting a credential. Confirming that the credential belongs to the person presenting it is the responsibility of the relying party.",
  },
] as const;

export default function GuidePage() {
  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />

      <div className="mx-auto max-w-300 px-6 sm:px-8">
        {/* Page header */}
        <div className="border-b border-[hsl(var(--border-default))] py-12 md:py-14">
          <p className="kicker mb-3">Documentation</p>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] leading-[1.08] md:text-[2.5rem]">
            Verification Guide
          </h1>
          <p className="mt-3 max-w-[52ch] text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
            How to check issued credentials and sealed PDF records without accessing the institution workspace. Certiva provides two separate public checks, each serving a different purpose.
          </p>
        </div>

        {/* Choose the right check */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-8">Choose the right check</p>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--border-default))] md:grid-cols-2">
            {checkTypes.map(({ icon: Icon, kicker, title, body, when, cta }) => (
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
                    Use when
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
                  <Link href={cta.href} className="btn-ghost btn-sm">
                    {cta.label}
                    <ArrowRightIcon size={12} weight="bold" aria-hidden />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Validity vs integrity */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-8">Credential validity vs. document integrity</p>
          <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] px-7 py-7">
            <div className="grid gap-8 md:grid-cols-2 md:gap-10">
              <div>
                <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[hsl(var(--text-tertiary))]">
                  Credential validity
                </p>
                <h3 className="mb-3 text-[0.9375rem] font-semibold tracking-tight">
                  Registry-backed status
                </h3>
                <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">
                  A valid credential means the registry record is recognised, the issuing institution is active, and the credential has not been revoked. This is a live registry lookup; revocation takes effect immediately.
                </p>
              </div>
              <div>
                <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[hsl(var(--text-tertiary))]">
                  Document integrity
                </p>
                <h3 className="mb-3 text-[0.9375rem] font-semibold tracking-tight">
                  File-level hash match
                </h3>
                <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">
                  A matching document means the uploaded PDF's SHA-256 hash is identical to the hash registered at issuance. This confirms the file has not changed. It does not confirm credential validity; those are independent checks.
                </p>
              </div>
            </div>
            <div className="mt-7 rounded-lg border border-[hsl(var(--status-warn-border))] bg-[hsl(var(--status-warn-bg))] px-4 py-3.5">
              <p className="text-[0.8125rem] leading-[1.6] text-[hsl(var(--status-warn-text))]">
                A credential can be valid in the registry while the PDF has been altered, or a PDF can match its proof while the credential has since been revoked. For complete assurance, run both checks.
              </p>
            </div>
          </div>
        </div>

        {/* Result states */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-8">Possible results</p>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--border-default))] md:grid-cols-2">
            {resultStates.map(({ icon: Icon, colorClass, bgClass, borderClass, label, applies, meaning }) => (
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
            ))}
          </div>
        </div>

        {/* Workflow */}
        <div className="border-b border-[hsl(var(--border-default))] py-10 md:py-12">
          <p className="kicker mb-8">Recommended verification workflow</p>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--border-default))] md:grid-cols-2">
            {workflowSteps.map(({ step, title, body }, i) => (
              <div
                key={step}
                className={`bg-[hsl(var(--bg-base))] px-7 py-7${i === workflowSteps.length - 1 && workflowSteps.length % 2 !== 0 ? " md:col-span-2" : ""}`}
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
          <p className="kicker mb-8">Limitations</p>
          <div className="divide-y divide-[hsl(var(--border-subtle))] overflow-hidden rounded-xl border border-[hsl(var(--border-default))]">
            {limitations.map(({ title, body }) => (
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
            Credential Check
            <ArrowRightIcon size={13} weight="bold" aria-hidden />
          </Link>
          <Link href="/verify/document" className="btn-ghost">
            Document Check
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
