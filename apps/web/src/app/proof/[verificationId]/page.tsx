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
import { getServerDictionary } from "../../../lib/i18n-server";
import type { Dictionary } from "../../../lib/i18n-dictionary";

interface ProofPageProps {
  params: Promise<{ verificationId: string }>;
}

export async function generateMetadata({ params }: ProofPageProps): Promise<Metadata> {
  const { verificationId } = await params;
  const t = await getServerDictionary();
  return { title: `${t.metadata.documentProofTitlePrefix} ${verificationId}` };
}

function getStateConfig(status: DocumentProofVerificationResponse["status"], t: Dictionary) {
  if (status === "AUTHENTIC") {
    return {
      verdict: t.proofResult.states.authentic.verdict,
      title: t.proofResult.states.authentic.title,
      description: t.proofResult.states.authentic.description,
      icon: CheckCircle,
      accentClass: "result-accent-valid",
      verdictClass: "badge badge-valid",
    };
  }
  if (status === "REVOKED") {
    return {
      verdict: t.proofResult.states.revoked.verdict,
      title: t.proofResult.states.revoked.title,
      description: t.proofResult.states.revoked.description,
      icon: Warning,
      accentClass: "result-accent-warn",
      verdictClass: "badge badge-warn",
    };
  }
  if (status === "DOCUMENT_MODIFIED") {
    return {
      verdict: t.proofResult.states.modified.verdict,
      title: t.proofResult.states.modified.title,
      description: t.proofResult.states.modified.description,
      icon: XCircle,
      accentClass: "result-accent-error",
      verdictClass: "badge badge-error",
    };
  }
  return {
    verdict: t.proofResult.states.notFound.verdict,
    title: t.proofResult.states.notFound.title,
    description: t.proofResult.states.notFound.description,
    icon: XCircle,
    accentClass: "result-accent-neutral",
    verdictClass: "badge badge-neutral",
  };
}

export default async function ProofPage({ params }: ProofPageProps) {
  const { verificationId } = await params;
  const t = await getServerDictionary();
  const proof = await apiFetch<DocumentProofVerificationResponse>(
    `/proof/${encodeURIComponent(verificationId)}`,
  );
  const state = getStateConfig(proof.status, t);
  const StateIcon = state.icon;
  const institutionLabel =
    proof.issuer?.displayName ?? proof.issuer?.name ?? t.proofResult.fallbackInstitution;

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">

      <SiteHeader />

      {/* -- Verdict banner ------------------------------- */}
      <section className={`border-b border-[hsl(var(--border-default))] ${state.accentClass}`}>
        <div className="mx-auto max-w-275 px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
          <div className="flex items-start justify-between gap-4 sm:gap-6">
            <div className="flex-1 min-w-0">
              <span className={`${state.verdictClass} mb-4`}>
                <StateIcon size={9} weight="fill" aria-hidden />
                {state.verdict}
              </span>
              <h1 className="text-[1.375rem] sm:text-[1.75rem] font-semibold tracking-[-0.03em] leading-[1.1] text-[hsl(var(--text-primary))] md:text-[2.25rem]">
                {state.title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
                {state.description}
              </p>
            </div>
            <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-tertiary))]">
              <StateIcon size={22} weight="duotone" aria-hidden />
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-6 sm:mt-8 grid gap-px bg-[hsl(var(--border-default))] rounded-xl overflow-hidden border border-[hsl(var(--border-default))] sm:grid-cols-3">
            <div className="bg-[hsl(var(--bg-base))] px-4 sm:px-6 py-4 sm:py-5">
              <p className="kicker mb-2">{t.common.status}</p>
              <p className="text-lg font-semibold tracking-tight text-[hsl(var(--text-primary))]">
                {state.verdict}
              </p>
            </div>
            <div className="bg-[hsl(var(--bg-base))] px-4 sm:px-6 py-4 sm:py-5">
              <p className="kicker mb-2">{t.proofResult.proofId}</p>
              <p className="hash-text text-[hsl(var(--text-secondary))] break-all">{proof.verificationId ?? verificationId}</p>
            </div>
            <div className="bg-[hsl(var(--bg-base))] px-4 sm:px-6 py-4 sm:py-5">
              <p className="kicker mb-2">{t.proofResult.runAnotherLookup}</p>
              <DocumentProofCodeForm compact initialValue={verificationId} />
            </div>
          </div>
        </div>
      </section>

      {/* -- Main content --------------------------------- */}
      <div className="mx-auto max-w-275 px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_300px]">

          {/* Left */}
          <div className="space-y-6">

            {/* Hash comparison */}
            <div>
              <p className="kicker mb-3">{t.proofResult.hashComparison}</p>
              <div className="work-surface overflow-hidden p-0">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { label: t.proofResult.registeredHash, value: proof.registeredHash ?? t.common.notAvailable, mono: true },
                      { label: t.proofResult.uploadedHash, value: proof.uploadedHash ?? t.common.noUploadedDocument, mono: true },
                      { label: t.proofResult.hashComparison, value: proof.integrityMatched ? t.common.match : t.common.mismatch, mono: false },
                      { label: t.proofResult.tamperDetected, value: proof.tamperDetected ? t.common.yes : t.common.no, mono: false },
                      { label: t.proofResult.checkedAt, value: formatDateTime(proof.verificationTimestamp), mono: false },
                      { label: t.proofResult.checkCount, value: String(proof.verificationCount), mono: false },
                    ].map((row, i) => (
                      <tr key={row.label} className={i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""}>
                        <td className="w-28 sm:w-44 shrink-0 px-4 sm:px-6 py-3 text-xs font-medium text-[hsl(var(--text-tertiary))] align-middle">{row.label}</td>
                        <td className={`px-4 sm:px-6 py-3 text-[hsl(var(--text-primary))] align-middle ${row.mono ? "font-mono text-xs break-all leading-5" : "text-sm"}`}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Document metadata */}
            <div>
              <p className="kicker mb-3">{t.proofResult.documentMetadata}</p>
              <div className="work-surface overflow-hidden p-0">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { label: t.proofResult.verificationCode, value: proof.verificationCode ?? t.common.notAvailable, mono: true },
                      { label: t.uploadPanel.tableDocumentTitle, value: proof.title ?? t.common.notAvailable, mono: false },
                      { label: t.uploadPanel.tableDocumentType, value: proof.documentType ?? t.common.notAvailable, mono: false },
                      { label: t.proofResult.referenceNumber, value: proof.referenceNumber ?? t.common.notProvided, mono: false },
                      { label: t.uploadPanel.tableDocumentDate, value: proof.documentDate ? formatDate(proof.documentDate) : t.common.notProvided, mono: false },
                      { label: t.proofResult.proofTimestamp, value: proof.proofTimestamp ? formatDateTime(proof.proofTimestamp) : t.common.notAvailable, mono: false },
                      { label: t.uploadPanel.tableIssuedBy, value: proof.issuedBy ?? t.common.notAvailable, mono: false },
                      { label: t.proofResult.proofStatus, value: proof.revoked ? t.common.revoked : t.common.active, mono: false },
                    ].map((row, i) => (
                      <tr key={row.label} className={i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""}>
                        <td className="w-28 sm:w-44 shrink-0 px-4 sm:px-6 py-3 text-xs font-medium text-[hsl(var(--text-tertiary))] align-middle">{row.label}</td>
                        <td className={`px-4 sm:px-6 py-3 text-[hsl(var(--text-primary))] align-middle ${row.mono ? "font-mono text-xs break-all" : "text-sm"}`}>{row.value}</td>
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
                <p className="kicker mb-1">{t.verifyResult.issuingInstitution}</p>
                <h2 className="section-title">{institutionLabel}</h2>
              </div>
              <div>
                {[
                  { label: t.proofResult.hashMatch, value: proof.authentic ? t.common.yes : t.common.no },
                  { label: t.common.revoked, value: proof.revoked ? t.common.yes : t.common.no },
                  { label: t.proofResult.checks, value: String(proof.verificationCount) },
                  { label: t.verifyResult.domain, value: proof.issuer?.domain ?? t.common.notAvailable },
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
                    {t.verifyResult.visitInstitutionWebsite}
                    <ArrowSquareOut size={11} aria-hidden />
                  </a>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-5 py-4">
              <p className="kicker mb-1.5">{t.proofResult.aboutDocumentProofs}</p>
              <p className="meta-text">
                {t.proofResult.aboutBody}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
