import Link from "next/link";
import type { Metadata } from "next";
import {
  CheckCircle,
  Warning,
  XCircle,
  Globe,
  ArrowSquareOut,
} from "@phosphor-icons/react/dist/ssr";

import { DocumentProofCodeForm } from "../../../components/document-proof-code-form";
import { SiteHeader } from "../../../components/site-header";
import { StatusBadge } from "../../../components/status-badge";
import { apiFetch, type DocumentProofVerificationResponse } from "../../../lib/api";
import { formatDate, formatDateTime } from "../../../lib/date-format";

interface ProofPageProps {
  params: Promise<{ verificationId: string }>;
}

export async function generateMetadata({ params }: ProofPageProps): Promise<Metadata> {
  const { verificationId } = await params;
  return { title: `Document Proof ${verificationId}` };
}

function getStateConfig(status: DocumentProofVerificationResponse["status"]) {
  if (status === "AUTHENTIC") {
    return {
      verdict: "Authentic",
      title: "Document hash verified.",
      description: "The uploaded or referenced document matches the registered SHA-256 proof record.",
      icon: CheckCircle,
      accentClass: "result-accent-valid",
      verdictClass: "badge badge-valid",
    };
  }
  if (status === "REVOKED") {
    return {
      verdict: "Revoked",
      title: "This proof record has been revoked.",
      description: "The proof exists, but it is no longer active.",
      icon: Warning,
      accentClass: "result-accent-warn",
      verdictClass: "badge badge-warn",
    };
  }
  if (status === "DOCUMENT_MODIFIED") {
    return {
      verdict: "Modified",
      title: "Document hash mismatch detected.",
      description: "A proof record was found, but the compared file does not match the registered SHA-256.",
      icon: XCircle,
      accentClass: "result-accent-error",
      verdictClass: "badge badge-error",
    };
  }
  return {
    verdict: "Not found",
    title: "No trusted proof matched this reference.",
    description: "Confirm the proof ID or verification code with the issuing institution.",
    icon: XCircle,
    accentClass: "result-accent-neutral",
    verdictClass: "badge badge-neutral",
  };
}

export default async function ProofPage({ params }: ProofPageProps) {
  const { verificationId } = await params;
  const proof = await apiFetch<DocumentProofVerificationResponse>(
    `/proof/${encodeURIComponent(verificationId)}`,
  );
  const state = getStateConfig(proof.status);
  const StateIcon = state.icon;
  const institutionLabel = proof.issuer?.displayName ?? proof.issuer?.name ?? "Issuing institution";

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">

      <SiteHeader />

      {/* ── Verdict banner ─────────────────────────────── */}
      <section className={`border-b border-[hsl(var(--border-default))] ${state.accentClass}`}>
        <div className="mx-auto max-w-275 px-8 py-10 md:py-12">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <span className={`${state.verdictClass} mb-4`}>
                <StateIcon size={9} weight="fill" aria-hidden />
                {state.verdict}
              </span>
              <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] leading-[1.1] text-[hsl(var(--text-primary))] md:text-[2.25rem]">
                {state.title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
                {state.description}
              </p>
            </div>
            <div className="hidden md:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-tertiary))]">
              <StateIcon size={22} weight="duotone" aria-hidden />
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-8 grid gap-px bg-[hsl(var(--border-default))] rounded-xl overflow-hidden border border-[hsl(var(--border-default))] sm:grid-cols-3">
            <div className="bg-[hsl(var(--bg-base))] px-6 py-5">
              <p className="kicker mb-2">Status</p>
              <p className="text-lg font-semibold tracking-tight text-[hsl(var(--text-primary))]">
                {state.verdict}
              </p>
            </div>
            <div className="bg-[hsl(var(--bg-base))] px-6 py-5">
              <p className="kicker mb-2">Proof ID</p>
              <p className="hash-text text-[hsl(var(--text-secondary))]">{proof.verificationId ?? verificationId}</p>
            </div>
            <div className="bg-[hsl(var(--bg-base))] px-6 py-5">
              <p className="kicker mb-2">Run another lookup</p>
              <DocumentProofCodeForm compact initialValue={verificationId} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Main content ───────────────────────────────── */}
      <div className="mx-auto max-w-275 px-8 py-10 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">

          {/* Left */}
          <div className="space-y-6">

            {/* Hash comparison */}
            <div>
              <p className="kicker mb-3">Hash comparison</p>
              <div className="work-surface overflow-hidden p-0">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { label: "Registered SHA-256", value: proof.registeredHash ?? "Not available", mono: true },
                      { label: "Uploaded SHA-256", value: proof.uploadedHash ?? "No uploaded document in this check", mono: true },
                      { label: "Hash comparison", value: proof.integrityMatched ? "Match" : "Mismatch", mono: false },
                      { label: "Tamper detected", value: proof.tamperDetected ? "Yes" : "No", mono: false },
                      { label: "Checked at", value: formatDateTime(proof.verificationTimestamp), mono: false },
                      { label: "Check count", value: String(proof.verificationCount), mono: false },
                    ].map((row, i) => (
                      <tr key={row.label} className={i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""}>
                        <td className="w-44 shrink-0 px-6 py-3 text-xs font-medium text-[hsl(var(--text-tertiary))] align-middle">{row.label}</td>
                        <td className={`px-6 py-3 text-[hsl(var(--text-primary))] align-middle ${row.mono ? "font-mono text-xs break-all leading-5" : "text-sm"}`}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Document metadata */}
            <div>
              <p className="kicker mb-3">Document metadata</p>
              <div className="work-surface overflow-hidden p-0">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { label: "Verification code", value: proof.verificationCode ?? "Not available", mono: true },
                      { label: "Document title", value: proof.title ?? "Not available", mono: false },
                      { label: "Document type", value: proof.documentType ?? "Not available", mono: false },
                      { label: "Reference number", value: proof.referenceNumber ?? "Not provided", mono: false },
                      { label: "Document date", value: proof.documentDate ? formatDate(proof.documentDate) : "Not provided", mono: false },
                      { label: "Proof timestamp", value: proof.proofTimestamp ? formatDateTime(proof.proofTimestamp) : "Not available", mono: false },
                      { label: "Issued by", value: proof.issuedBy ?? "Not available", mono: false },
                      { label: "Proof status", value: proof.revoked ? "Revoked" : "Active", mono: false },
                    ].map((row, i) => (
                      <tr key={row.label} className={i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""}>
                        <td className="w-44 shrink-0 px-6 py-3 text-xs font-medium text-[hsl(var(--text-tertiary))] align-middle">{row.label}</td>
                        <td className={`px-6 py-3 text-[hsl(var(--text-primary))] align-middle ${row.mono ? "font-mono text-xs break-all" : "text-sm"}`}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right -- issuer */}
          <div className="space-y-4">
            <div className="work-surface overflow-hidden p-0">
              <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
                <p className="kicker mb-1">Issuing institution</p>
                <h2 className="section-title">{institutionLabel}</h2>
              </div>
              <div>
                {[
                  { label: "Hash match", value: proof.authentic ? "Yes" : "No" },
                  { label: "Revoked", value: proof.revoked ? "Yes" : "No" },
                  { label: "Checks", value: String(proof.verificationCount) },
                  { label: "Domain", value: proof.issuer?.domain ?? "Not available" },
                ].map((row, i, arr) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between gap-3 px-5 py-3 ${i < arr.length - 1 ? "border-b border-[hsl(var(--border-subtle))]" : ""}`}
                  >
                    <div className="flex items-center gap-2 text-[hsl(var(--text-tertiary))]">
                      <Globe size={13} aria-hidden />
                      <span className="text-xs">{row.label}</span>
                    </div>
                    <span className="text-xs font-medium text-[hsl(var(--text-secondary))]">{row.value}</span>
                  </div>
                ))}
              </div>
              {proof.issuer?.websiteUrl && (
                <div className="border-t border-[hsl(var(--border-default))] px-5 py-4">
                  <a
                    href={proof.issuer.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] transition-colors"
                  >
                    Visit institution website
                    <ArrowSquareOut size={11} aria-hidden />
                  </a>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-5 py-4">
              <p className="kicker mb-1.5">About document proofs</p>
              <p className="meta-text">
                Results reflect hash comparison at the time of this check. Does not imply credential validity; only confirms SHA-256 integrity of the registered document.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
