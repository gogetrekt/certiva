import type { Metadata } from "next";
import {
  CheckCircle,
  Warning,
  XCircle,
  Buildings,
  Globe,
  LinkSimple,
  ArrowSquareOut,
} from "@phosphor-icons/react/dist/ssr";

import { SiteHeader } from "../../../components/site-header";
import { StatusBadge } from "../../../components/status-badge";
import { VerifySearchForm } from "../../../components/verify-search-form";
import { apiFetch, type VerificationResponse } from "../../../lib/api";
import { formatDateTime } from "../../../lib/date-format";
import { getServerDictionary } from "../../../lib/i18n-server";
import type { Dictionary } from "../../../lib/i18n-dictionary";

const POLYGON_AMOY_EXPLORER_URL = "https://amoy.polygonscan.com";

interface VerifyResultPageProps {
  params: Promise<{ verificationId: string }>;
}

export async function generateMetadata({ params }: VerifyResultPageProps): Promise<Metadata> {
  const { verificationId } = await params;
  const t = await getServerDictionary();
  return { title: `${t.metadata.verificationTitlePrefix} ${verificationId}` };
}

function getStateConfig(result: VerificationResponse["result"], t: Dictionary) {
  if (result === "VALID") {
    return {
      verdict: t.verifyResult.states.valid.verdict,
      title: t.verifyResult.states.valid.title,
      description: t.verifyResult.states.valid.description,
      icon: CheckCircle,
      accentClass: "result-accent-valid",
      verdictClass: "badge badge-valid",
    };
  }
  if (result === "REVOKED") {
    return {
      verdict: t.verifyResult.states.revoked.verdict,
      title: t.verifyResult.states.revoked.title,
      description: t.verifyResult.states.revoked.description,
      icon: Warning,
      accentClass: "result-accent-warn",
      verdictClass: "badge badge-warn",
    };
  }
  return {
    verdict: t.verifyResult.states.notRegistered.verdict,
    title: t.verifyResult.states.notRegistered.title,
    description: t.verifyResult.states.notRegistered.description,
    icon: XCircle,
    accentClass: "result-accent-neutral",
    verdictClass: "badge badge-neutral",
  };
}

export default async function VerifyResultPage({ params }: VerifyResultPageProps) {
  const { verificationId } = await params;
  const t = await getServerDictionary();
  const verification = await apiFetch<VerificationResponse>(
    `/verify/${encodeURIComponent(verificationId)}`,
  );
  const state = getStateConfig(verification.result, t);
  const institutionLabel =
    verification.issuer?.displayName ?? verification.issuer?.name ?? t.verifyResult.fallbackInstitution;
  const StateIcon = state.icon;

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">

      <SiteHeader />

      {/* ── Verdict banner ─────────────────────────────── */}
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

          {/* Key stats */}
          <div className="mt-6 sm:mt-8 grid gap-px bg-[hsl(var(--border-default))] rounded-xl overflow-hidden border border-[hsl(var(--border-default))] sm:grid-cols-3">
            <div className="bg-[hsl(var(--bg-base))] px-4 sm:px-6 py-4 sm:py-5">
              <p className="kicker mb-2">{t.verifyResult.registryVerdict}</p>
              <div className="flex flex-wrap items-start gap-2">
                <StatusBadge status={verification.result} />
                <StatusBadge status={verification.blockchainStatus} />
              </div>
            </div>
            <div className="bg-[hsl(var(--bg-base))] px-4 sm:px-6 py-4 sm:py-5">
              <p className="kicker mb-2">{t.verifyResult.credentialId}</p>
              <p className="hash-text text-[hsl(var(--text-secondary))] break-all">{verification.credentialExternalId ?? t.common.notAvailable}</p>
            </div>
            <div className="bg-[hsl(var(--bg-base))] px-4 sm:px-6 py-4 sm:py-5">
              <p className="kicker mb-2">{t.verifyResult.runAnotherLookup}</p>
              <VerifySearchForm initialValue={verificationId} compact />
            </div>
          </div>
        </div>
      </section>

      {/* ── Main content ───────────────────────────────── */}
      <div className="mx-auto max-w-275 px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_300px]">

          {/* Left column */}
          <div className="space-y-6">

            {/* Credential facts */}
            <div>
              <p className="kicker mb-3">{t.verifyResult.credentialFacts}</p>
              <div className="work-surface overflow-hidden p-0">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { label: t.verifyResult.studentName, value: verification.credential?.studentName ?? t.common.notAvailable, mono: false },
                      { label: t.verifyResult.studentId, value: verification.credential?.studentId ?? t.common.notAvailable, mono: true },
                      { label: t.verifyResult.degreeCredential, value: verification.degree ?? t.common.notAvailable, mono: false },
                      { label: t.verifyResult.issuedAt, value: verification.issuedAt ? formatDateTime(verification.issuedAt) : t.common.notAvailable, mono: false },
                      ...(verification.revoked && verification.revokedAt ? [
                        { label: t.verifyResult.revokedAt, value: formatDateTime(verification.revokedAt), mono: false },
                        ...(verification.revocationReason ? [{ label: t.verifyResult.revocationReason, value: verification.revocationReason, mono: false }] : []),
                      ] : []),
                      { label: t.verifyResult.credentialStatus, value: verification.revoked ? t.common.revoked : t.common.active, mono: false },
                      { label: t.verifyResult.securePdfProof, value: verification.securePdfEnabled ? t.verifyResult.proofRegistered : t.common.notEnabled, mono: false },
                      { label: t.verifyResult.blockchainProof, value: verification.blockchainStatus === "ON_CHAIN_VERIFIED" ? t.common.anchored : verification.blockchainStatus === "PENDING" ? t.common.pending : verification.blockchainStatus === "FAILED" ? t.common.failed : t.common.notAnchored, mono: false },
                      { label: t.verifyResult.verificationCount, value: String(verification.verificationCount), mono: false },
                      { label: t.verifyResult.lastChecked, value: verification.verifiedAtTimestamp ? formatDateTime(verification.verifiedAtTimestamp) : t.common.notAvailable, mono: false },
                    ].map((row, i) => (
                      <tr key={row.label} className={i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""}>
                        <td className="w-28 sm:w-44 shrink-0 px-4 sm:px-6 py-3 text-xs font-medium text-[hsl(var(--text-tertiary))] align-middle">
                          {row.label}
                        </td>
                        <td className={`px-4 sm:px-6 py-3 text-[hsl(var(--text-primary))] align-middle ${row.mono ? "font-mono text-xs break-all leading-5" : "text-sm"}`}>
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trust signals */}
            <div>
              <p className="kicker mb-3">{t.verifyResult.trustSignals}</p>
              <div className="work-surface overflow-hidden p-0">
                <table className="w-full">
                  <tbody>
                    {verification.trustChecks.map((check, i) => (
                      <tr
                        key={check.key}
                        className={`${i < verification.trustChecks.length - 1 ? "border-b border-[hsl(var(--border-subtle))]" : ""} ${i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""}`}
                      >
                        <td className="px-6 py-3 text-sm text-[hsl(var(--text-primary))]">{check.label}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end">
                            <StatusBadge status={check.ok ? "VALID" : "INVALID"} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Advanced references */}
            <details>
              <summary className="disclosure-trigger">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden className="shrink-0">
                  <path d="M4 5l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t.verifyResult.technicalSummary}
              </summary>
              <div className="mt-4 work-surface overflow-hidden p-0">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { label: t.verifyResult.verificationUrl, value: verification.verificationUrl ?? t.common.notAvailable, href: verification.verificationUrl ?? undefined },
                      { label: t.verifyResult.metadataJson, value: verification.metadataUri ?? t.common.notAvailable, href: verification.metadataUri ?? undefined },
                      { label: t.verifyResult.certificatePdf, value: verification.certificateUri ?? t.common.notAvailable, href: verification.certificateUri ?? undefined },
                      { label: t.verifyResult.qrAsset, value: verification.qrCodeUri ?? t.common.notAvailable, href: verification.qrCodeUri ?? undefined },
                      { label: t.verifyResult.internalDbId, value: verification.credential?.id ?? t.common.notAvailable, mono: true },
                      { label: t.verifyResult.blockchainTxHash, value: verification.txHash ?? t.common.notAvailable, mono: true },
                    ].map((row, i) => (
                      <tr key={row.label} className={i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""}>
                        <td className="w-28 sm:w-44 shrink-0 px-4 sm:px-6 py-3 text-xs font-medium text-[hsl(var(--text-tertiary))] align-middle">
                          {row.label}
                        </td>
                        <td className="px-6 py-3 align-middle">
                          {row.href ? (
                            <a href={row.href} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] underline underline-offset-2 break-all transition-colors">
                              {row.value}
                              <ArrowSquareOut size={11} className="shrink-0" aria-hidden />
                            </a>
                          ) : (
                            <span className={"mono" in row && row.mono ? "font-mono text-xs text-[hsl(var(--text-secondary))] break-all" : "text-sm text-[hsl(var(--text-secondary))]"}>
                              {row.value}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Issuer card */}
            <div className="work-surface overflow-hidden p-0">
              <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
                <p className="kicker mb-1">{t.verifyResult.issuingInstitution}</p>
                <h2 className="section-title">{institutionLabel}</h2>
              </div>
              <div>
                {[
                  { icon: Buildings, label: t.common.status, value: verification.issuer?.status ?? t.common.unavailable },
                  { icon: Globe, label: t.verifyResult.domain, value: verification.issuer?.domain ?? t.common.notAvailable, mono: true },
                  { icon: LinkSimple, label: t.verifyResult.verifications, value: String(verification.verificationCount) },
                  { icon: Warning, label: t.common.revoked, value: verification.revoked ? t.common.yes : t.common.no },
                ].map((row, i, arr) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between gap-3 px-5 py-3 ${i < arr.length - 1 ? "border-b border-[hsl(var(--border-subtle))]" : ""}`}
                  >
                    <div className="flex items-center gap-2 text-[hsl(var(--text-tertiary))]">
                      <row.icon size={13} aria-hidden />
                      <span className="text-xs">{row.label}</span>
                    </div>
                    <span className={`text-xs font-medium text-[hsl(var(--text-secondary))] ${"mono" in row && row.mono ? "font-mono" : ""}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
              {verification.issuer?.websiteUrl && (
                <div className="border-t border-[hsl(var(--border-default))] px-5 py-4">
                  <a
                    href={verification.issuer.websiteUrl}
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

            {/* Blockchain card */}
            <div className="work-surface overflow-hidden p-0">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border-default))]">
                <div>
                  <p className="kicker mb-1">{t.verifyResult.blockchainProof}</p>
                  <p className="meta-text">{t.verifyResult.secondaryAuditLayer}</p>
                </div>
                <StatusBadge status={verification.blockchainStatus} />
              </div>
              <div>
                {[
                  { label: t.verifyResult.network, value: "Polygon Amoy" },
                  { label: t.verifyResult.verified, value: verification.blockchainVerified ? t.common.yes : t.common.no },
                  { label: t.verifyResult.block, value: verification.blockNumber ? String(verification.blockNumber) : t.common.pending },
                  { label: t.common.anchored, value: verification.anchoredAt ? formatDateTime(verification.anchoredAt) : t.common.pending },
                ].map((row, i, arr) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between gap-3 px-5 py-3 ${i < arr.length - 1 ? "border-b border-[hsl(var(--border-subtle))]" : ""}`}
                  >
                    <span className="text-xs text-[hsl(var(--text-tertiary))]">{row.label}</span>
                    <span className="text-xs font-medium text-[hsl(var(--text-secondary))] text-right">{row.value}</span>
                  </div>
                ))}
                {verification.txHash && (
                  <div className="px-5 py-3 border-t border-[hsl(var(--border-subtle))]">
                    <p className="kicker mb-1.5">{t.verifyResult.transactionHash}</p>
                    <p className="hash-text text-[hsl(var(--text-tertiary))]">{verification.txHash}</p>
                  </div>
                )}
              </div>
              {verification.txHash && (
                <div className="border-t border-[hsl(var(--border-default))] px-5 py-4">
                  <a
                    href={`${POLYGON_AMOY_EXPLORER_URL}/tx/${verification.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] transition-colors"
                  >
                    {t.verifyResult.viewOnPolygonscan}
                    <ArrowSquareOut size={11} aria-hidden />
                  </a>
                </div>
              )}
            </div>

            {/* Note */}
            <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-5 py-4">
              <p className="kicker mb-1.5">{t.verifyResult.aboutThisVerification}</p>
              <p className="meta-text">
                {t.verifyResult.aboutBody}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
