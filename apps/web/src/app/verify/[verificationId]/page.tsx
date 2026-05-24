import Link from "next/link";
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

import { AppLogo } from "../../../components/app-logo";
import { StatusBadge } from "../../../components/status-badge";
import { ThemeToggle } from "../../../components/theme-toggle";
import { VerifySearchForm } from "../../../components/verify-search-form";
import { apiFetch, type VerificationResponse } from "../../../lib/api";
import { formatDateTime } from "../../../lib/date-format";

const POLYGON_AMOY_EXPLORER_URL = "https://amoy.polygonscan.com";

interface VerifyResultPageProps {
  params: Promise<{ verificationId: string }>;
}

export async function generateMetadata({ params }: VerifyResultPageProps): Promise<Metadata> {
  const { verificationId } = await params;
  return { title: `Verification — ${verificationId}` };
}

function getStateConfig(result: VerificationResponse["result"]) {
  if (result === "VALID") {
    return {
      verdict: "Active",
      title: "Credential record found and active.",
      description: "The credential ID matches an active registry record. Compare the details below with the presented document. To verify file integrity, use Document Check.",
      icon: CheckCircle,
      accentClass: "result-accent-valid",
      verdictClass: "badge badge-valid",
    };
  }
  if (result === "REVOKED") {
    return {
      verdict: "Revoked",
      title: "This credential has been revoked.",
      description: "The verification reference matches a known record, but the institution has marked it as no longer valid.",
      icon: Warning,
      accentClass: "result-accent-warn",
      verdictClass: "badge badge-warn",
    };
  }
  if (result === "TAMPERED") {
    return {
      verdict: "Tampered",
      title: "Registry proof mismatch detected.",
      description: "The record exists, but the stored proof checks do not align with the expected result.",
      icon: XCircle,
      accentClass: "result-accent-error",
      verdictClass: "badge badge-error",
    };
  }
  return {
    verdict: "Not found",
    title: "No matching credential found.",
    description: "No active credential matched this reference. Confirm the verification ID with the issuing institution.",
    icon: XCircle,
    accentClass: "result-accent-neutral",
    verdictClass: "badge badge-neutral",
  };
}

export default async function VerifyResultPage({ params }: VerifyResultPageProps) {
  const { verificationId } = await params;
  const verification = await apiFetch<VerificationResponse>(
    `/verify/${encodeURIComponent(verificationId)}`,
  );
  const state = getStateConfig(verification.result);
  const institutionLabel = verification.issuer?.displayName ?? verification.issuer?.name ?? "Issuing institution";
  const StateIcon = state.icon;

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">

      {/* ── Header ─────────────────────────────────────── */}
      <header className="border-b border-[hsl(var(--border-default))]">
        <div className="mx-auto flex h-13 w-full max-w-275 items-center justify-between px-8">
          <AppLogo />
          <nav className="flex items-center gap-1.5">
            <Link
              href="/verify"
              className="h-8 px-3 rounded-md inline-flex items-center text-xs font-medium text-[hsl(var(--text-tertiary))] transition-colors hover:bg-[hsl(var(--bg-muted))] hover:text-[hsl(var(--text-primary))]"
            >
              New lookup
            </Link>
            <Link
              href="/verify/document"
              className="h-8 px-3 rounded-md inline-flex items-center text-xs font-medium text-[hsl(var(--text-tertiary))] transition-colors hover:bg-[hsl(var(--bg-muted))] hover:text-[hsl(var(--text-primary))]"
            >
              Document Check
            </Link>
            <div className="mx-1 h-4 w-px bg-[hsl(var(--border-default))]" />
            <ThemeToggle />
          </nav>
        </div>
      </header>

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

          {/* Key stats */}
          <div className="mt-8 grid gap-px bg-[hsl(var(--border-default))] rounded-xl overflow-hidden border border-[hsl(var(--border-default))] sm:grid-cols-3">
            <div className="bg-[hsl(var(--bg-base))] px-6 py-5">
              <p className="kicker mb-2">Registry verdict</p>
              <div className="flex flex-wrap items-start gap-2">
                <StatusBadge status={verification.result} />
                <StatusBadge status={verification.blockchainStatus} />
              </div>
            </div>
            <div className="bg-[hsl(var(--bg-base))] px-6 py-5">
              <p className="kicker mb-2">Credential ID</p>
              <p className="hash-text text-[hsl(var(--text-secondary))]">{verification.credentialExternalId ?? "Not available"}</p>
            </div>
            <div className="bg-[hsl(var(--bg-base))] px-6 py-5">
              <p className="kicker mb-2">Run another lookup</p>
              <VerifySearchForm initialValue={verificationId} compact />
            </div>
          </div>
        </div>
      </section>

      {/* ── Main content ───────────────────────────────── */}
      <div className="mx-auto max-w-275 px-8 py-10 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">

          {/* Left column */}
          <div className="space-y-6">

            {/* Credential facts */}
            <div>
              <p className="kicker mb-3">Credential facts</p>
              <div className="work-surface overflow-hidden p-0">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { label: "Student name", value: verification.credential?.studentName ?? "Not available", mono: false },
                      { label: "Student ID", value: verification.credential?.studentId ?? "Not available", mono: true },
                      { label: "Degree / credential", value: verification.degree ?? "Not available", mono: false },
                      { label: "Issued at", value: verification.issuedAt ? formatDateTime(verification.issuedAt) : "Not available", mono: false },
                      ...(verification.revoked && verification.revokedAt ? [
                        { label: "Revoked at", value: formatDateTime(verification.revokedAt), mono: false },
                        ...(verification.revocationReason ? [{ label: "Revocation reason", value: verification.revocationReason, mono: false }] : []),
                      ] : []),
                      { label: "Credential status", value: verification.revoked ? "Revoked" : "Active", mono: false },
                      { label: "Document integrity", value: verification.securePdfEnabled ? "Proof registered — upload PDF to verify" : "Not registered", mono: false },
                      { label: "Blockchain proof", value: verification.blockchainStatus === "ON_CHAIN_VERIFIED" ? "Anchored" : verification.blockchainStatus === "PENDING" ? "Pending" : verification.blockchainStatus === "FAILED" ? "Failed" : "Not anchored", mono: false },
                      { label: "Verification count", value: String(verification.verificationCount), mono: false },
                      { label: "Last checked", value: verification.verifiedAtTimestamp ? formatDateTime(verification.verifiedAtTimestamp) : "Not available", mono: false },
                    ].map((row, i) => (
                      <tr key={row.label} className={i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""}>
                        <td className="w-44 shrink-0 px-6 py-3 text-xs font-medium text-[hsl(var(--text-tertiary))] align-middle">
                          {row.label}
                        </td>
                        <td className={`px-6 py-3 text-[hsl(var(--text-primary))] align-middle ${row.mono ? "font-mono text-xs break-all leading-5" : "text-sm"}`}>
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
              <p className="kicker mb-3">Trust signals</p>
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
                Show technical references
              </summary>
              <div className="mt-4 work-surface overflow-hidden p-0">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { label: "Verification URL", value: verification.verificationUrl ?? "Not available", href: verification.verificationUrl ?? undefined },
                      { label: "Metadata JSON", value: verification.metadataUri ?? "Not available", href: verification.metadataUri ?? undefined },
                      { label: "Certificate PDF", value: verification.certificateUri ?? "Not available", href: verification.certificateUri ?? undefined },
                      { label: "QR asset", value: verification.qrCodeUri ?? "Not available", href: verification.qrCodeUri ?? undefined },
                      { label: "Internal DB ID", value: verification.credential?.id ?? "Not available", mono: true },
                      { label: "Blockchain tx hash", value: verification.txHash ?? "Not available", mono: true },
                    ].map((row, i) => (
                      <tr key={row.label} className={i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""}>
                        <td className="w-44 shrink-0 px-6 py-3 text-xs font-medium text-[hsl(var(--text-tertiary))] align-middle">
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
                <p className="kicker mb-1">Issuing institution</p>
                <h2 className="section-title">{institutionLabel}</h2>
              </div>
              <div>
                {[
                  { icon: Buildings, label: "Status", value: verification.issuer?.status ?? "Unknown" },
                  { icon: Globe, label: "Domain", value: verification.issuer?.domain ?? "Not available", mono: true },
                  { icon: LinkSimple, label: "Verifications", value: String(verification.verificationCount) },
                  { icon: Warning, label: "Revoked", value: verification.revoked ? "Yes" : "No" },
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
                    Visit institution website
                    <ArrowSquareOut size={11} aria-hidden />
                  </a>
                </div>
              )}
            </div>

            {/* Blockchain card */}
            <div className="work-surface overflow-hidden p-0">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border-default))]">
                <div>
                  <p className="kicker mb-1">Blockchain proof</p>
                  <p className="meta-text">Secondary audit layer</p>
                </div>
                <StatusBadge status={verification.blockchainStatus} />
              </div>
              <div>
                {[
                  { label: "Network", value: "Polygon Amoy" },
                  { label: "Verified", value: verification.blockchainVerified ? "Yes" : "No" },
                  { label: "Block", value: verification.blockNumber ? String(verification.blockNumber) : "Pending" },
                  { label: "Anchored", value: verification.anchoredAt ? formatDateTime(verification.anchoredAt) : "Pending" },
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
                    <p className="kicker mb-1.5">Transaction hash</p>
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
                    View on Polygonscan
                    <ArrowSquareOut size={11} aria-hidden />
                  </a>
                </div>
              )}
            </div>

            {/* Note */}
            <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-5 py-4">
              <p className="kicker mb-1.5">About this verification</p>
              <p className="meta-text">
                Certiva is an independent verification infrastructure. Results reflect the institutional registry state at the time of this check.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
