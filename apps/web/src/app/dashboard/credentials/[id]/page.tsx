import Link from "next/link";
import { ArrowSquareOut, CaretLeft } from "@phosphor-icons/react/dist/ssr";

import { DisclosurePanel } from "../../../../components/disclosure-panel";
import { DeleteCredentialButton } from "../../../../components/delete-credential-button";
import { InstitutionSetupState } from "../../../../components/institution-setup-state";
import { QrCodeCard } from "../../../../components/qr-code-card";
import { RevokeCredentialButton } from "../../../../components/revoke-credential-button";
import { StatusBadge } from "../../../../components/status-badge";
import type { CredentialRecord } from "../../../../lib/api";
import {
  getCredential,
  getCurrentAdmin,
  getSessionToken,
  isInstitutionSetupRequired,
} from "../../../../lib/api";
import { formatDate, formatDateTime } from "../../../../lib/date-format";

const POLYGON_AMOY_EXPLORER_URL = "https://amoy.polygonscan.com";

interface CredentialDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CredentialDetailPage({ params }: CredentialDetailPageProps) {
  const token = await getSessionToken();
  if (!token) return null;

  const admin = await getCurrentAdmin(token);
  const { id } = await params;
  let credential: CredentialRecord;

  try {
    credential = await getCredential(token, id);
  } catch (error) {
    if (isInstitutionSetupRequired(error)) {
      return <InstitutionSetupState isSuperAdmin={admin.role === "OWNER" || admin.role === "SUPER_ADMIN"} />;
    }
    throw error;
  }

  const status = credential.revoked ? "REVOKED" : "VALID";
  const institutionLabel = credential.issuer.displayName ?? credential.issuer.name;
  const transactionUrl = credential.txHash
    ? `${POLYGON_AMOY_EXPLORER_URL}/tx/${credential.txHash}`
    : null;
  const issuerAddressUrl = credential.issuer.wallet
    ? `${POLYGON_AMOY_EXPLORER_URL}/address/${credential.issuer.wallet}`
    : null;

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────── */}
      <div className="pb-5 border-b border-[hsl(var(--border-default))]">
        <Link
          href="/dashboard/credentials"
          className="inline-flex items-center gap-1 kicker hover:text-[hsl(var(--text-secondary))] transition-colors mb-3"
        >
          <CaretLeft size={11} aria-hidden />
          Credential registry
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{credential.degree}</h1>
            <p className="body-text mt-1">{credential.studentName} · {credential.studentId}</p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <StatusBadge status={status} />
            <StatusBadge
              status={credential.anchorStatus === "ANCHORED" ? "ON_CHAIN_VERIFIED" : credential.anchorStatus}
            />
            {credential.certificateUri ? (
              <a
                href={credential.certificateUri}
                target="_blank"
                rel="noreferrer"
                className="btn-primary btn-sm"
              >
                Certificate PDF
                <ArrowSquareOut size={11} aria-hidden />
              </a>
            ) : null}
            {credential.revoked ? (
              <DeleteCredentialButton
                credentialId={credential.id}
                redirectTo="/dashboard/credentials"
                summary={{
                  degree: credential.degree,
                  studentName: credential.studentName,
                  studentId: credential.studentId,
                  issuerName: institutionLabel,
                }}
              />
            ) : (
              <RevokeCredentialButton
                credentialId={credential.id}
                revoked={credential.revoked}
                summary={{
                  degree: credential.degree,
                  studentName: credential.studentName,
                  studentId: credential.studentId,
                  issuerName: institutionLabel,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Main grid ────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">

        {/* Left column */}
        <div className="space-y-5">

          {/* Core facts */}
          <div className="work-surface overflow-hidden p-0">
            <div className="px-6 py-5 border-b border-[hsl(var(--border-default))]">
              <p className="kicker mb-1">Core facts</p>
              <h2 className="section-title">Credential summary</h2>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "Student name", value: credential.studentName, mono: false },
                  { label: "Student ID", value: credential.studentId, mono: true },
                  { label: "Institution", value: institutionLabel, mono: false },
                  { label: "Degree / credential", value: credential.degree, mono: false },
                  { label: "Issued at", value: formatDateTime(credential.issuedAt), mono: false },
                  { label: "Status", value: credential.revoked ? "Revoked" : "Active", mono: false },
                  ...(credential.revoked && credential.revokedAt ? [
                    { label: "Revoked at", value: formatDateTime(credential.revokedAt), mono: false },
                    { label: "Revocation reason", value: credential.revocationReason ?? "Not specified", mono: false },
                  ] : []),
                  { label: "Credential ID", value: credential.verificationId, mono: true },
                  { label: "Verification count", value: String(credential.verificationCount), mono: false },
                  { label: "Last verified", value: credential.verifiedAt ? formatDateTime(credential.verifiedAt) : "No public checks yet", mono: false },
                ].map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""}>
                    <td className="w-40 shrink-0 px-6 py-3 text-xs font-medium text-[hsl(var(--text-tertiary))] align-middle">
                      {row.label}
                    </td>
                    <td className={`px-6 py-3 align-middle text-[hsl(var(--text-primary))] ${row.mono ? "font-mono text-xs break-all" : "text-sm"}`}>
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Public verification */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="kicker">Public verification</p>
              <Link
                href={`/verify/${credential.verificationId}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] transition-colors"
              >
                Open public result
                <ArrowSquareOut size={11} aria-hidden />
              </Link>
            </div>
            <QrCodeCard
              verificationId={credential.verificationId}
              verificationUrl={credential.verificationUrl}
              qrCodeUri={credential.qrCodeUri}
            />
          </div>

          {/* Blockchain proof */}
          <div className="work-surface overflow-hidden p-0">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[hsl(var(--border-default))]">
              <div>
                <p className="kicker mb-1">Blockchain proof</p>
                <h2 className="section-title">Secondary trust layer</h2>
              </div>
              <StatusBadge
                status={credential.anchorStatus === "ANCHORED" ? "ON_CHAIN_VERIFIED" : credential.anchorStatus}
              />
            </div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "Network", value: "Polygon Amoy", mono: false },
                  { label: "Chain ID", value: credential.chainId ? String(credential.chainId) : "80002", mono: false },
                  { label: "Transaction hash", value: credential.txHash ?? "Awaiting transaction", mono: true },
                  { label: "Block number", value: credential.blockNumber ? String(credential.blockNumber) : "Awaiting confirmation", mono: false },
                  { label: "Anchored at", value: credential.anchoredAt ? formatDateTime(credential.anchoredAt) : "Awaiting confirmation", mono: false },
                  { label: "Issuer wallet", value: credential.issuer.wallet ?? "Not configured", mono: true },
                ].map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""}>
                    <td className="w-40 shrink-0 px-6 py-3 text-xs font-medium text-[hsl(var(--text-tertiary))] align-middle">
                      {row.label}
                    </td>
                    <td className={`px-6 py-3 align-middle text-[hsl(var(--text-primary))] ${row.mono ? "font-mono text-xs break-all" : "text-sm"}`}>
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(transactionUrl || issuerAddressUrl) ? (
              <div className="flex flex-wrap gap-2 px-6 py-4 border-t border-[hsl(var(--border-default))]">
                {transactionUrl && (
                  <a href={transactionUrl} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
                    View transaction <ArrowSquareOut size={11} aria-hidden />
                  </a>
                )}
                {issuerAddressUrl && (
                  <a href={issuerAddressUrl} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
                    View issuer address <ArrowSquareOut size={11} aria-hidden />
                  </a>
                )}
              </div>
            ) : (
              <div className="px-6 py-4 border-t border-[hsl(var(--border-default))]">
                <p className="meta-text">Waiting for blockchain confirmation.</p>
              </div>
            )}
          </div>

          {/* Technical details (collapsed) */}
          <DisclosurePanel summary="Show technical and audit details">
            <div className="space-y-4 pt-2">
              <div className="work-surface overflow-hidden p-0">
                <div className="px-6 py-5 border-b border-[hsl(var(--border-default))]">
                  <p className="kicker mb-1">Technical references</p>
                  <h3 className="section-title">Assets and stored hashes</h3>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { label: "Internal DB ID", value: credential.id, mono: true },
                      { label: "Verification code", value: credential.verificationCode, mono: true },
                      { label: "Record hash", value: credential.hash, mono: true },
                      { label: "Registry proof hash", value: credential.chainProofHash, mono: true },
                      { label: "PDF integrity hash", value: credential.documentHash ?? "Not enabled", mono: true },
                      { label: "File size", value: formatFileSize(credential.fileSize), mono: false },
                    ].map((row, i) => (
                      <tr key={row.label} className={i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""}>
                        <td className="w-40 shrink-0 px-6 py-3 text-xs font-medium text-[hsl(var(--text-tertiary))] align-middle">{row.label}</td>
                        <td className={`px-6 py-3 align-middle text-[hsl(var(--text-secondary))] ${row.mono ? "font-mono text-xs break-all" : "text-sm"}`}>{row.value}</td>
                      </tr>
                    ))}
                    {[
                      { label: "Metadata URI", value: credential.metadataUri, href: credential.metadataUri },
                      { label: "QR asset", value: credential.qrCodeUri, href: credential.qrCodeUri },
                      { label: "Certificate PDF", value: credential.certificateUri ?? "Not available", href: credential.certificateUri ?? undefined },
                    ].map((row, i) => (
                      <tr key={row.label} className={(i + 5) % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : ""}>
                        <td className="w-40 shrink-0 px-6 py-3 text-xs font-medium text-[hsl(var(--text-tertiary))] align-middle">{row.label}</td>
                        <td className="px-6 py-3 align-middle">
                          {row.href ? (
                            <a href={row.href} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-xs text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] underline underline-offset-2 break-all">
                              {row.value} <ArrowSquareOut size={10} className="shrink-0" aria-hidden />
                            </a>
                          ) : (
                            <span className="font-mono text-xs text-[hsl(var(--text-tertiary))] break-all">{row.value}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(credential.activities ?? []).length > 0 && (
                <div className="work-surface overflow-hidden p-0">
                  <div className="px-6 py-5 border-b border-[hsl(var(--border-default))]">
                    <p className="kicker mb-1">Activity timeline</p>
                    <h3 className="section-title">Recent lifecycle events</h3>
                  </div>
                  <div>
                    {(credential.activities ?? []).map((activity, i, arr) => (
                      <div
                        key={activity.id}
                        className={`flex items-start justify-between gap-4 px-6 py-4 ${i < arr.length - 1 ? "border-b border-[hsl(var(--border-subtle))]" : ""}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[hsl(var(--text-primary))]">
                            {activity.type.replace(/_/g, " ")}
                          </p>
                          <p className="meta-text mt-1 wrap-break-word">{activity.description}</p>
                        </div>
                        <div className="shrink-0 text-right space-y-1.5">
                          <StatusBadge status={activity.status} />
                          <p className="meta-text">{formatDateTime(activity.occurredAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DisclosurePanel>
        </div>

        {/* Right column — snapshot */}
        <div className="work-surface overflow-hidden p-0 h-fit">
          <div className="px-6 py-5 border-b border-[hsl(var(--border-default))]">
            <p className="kicker mb-1">At a glance</p>
            <h2 className="section-title">Operational snapshot</h2>
          </div>
          <div>
            {[
              { label: "Institution", value: institutionLabel },
              { label: "Checks", value: `${credential.verificationCount} verification${credential.verificationCount !== 1 ? "s" : ""}` },
              { label: "Revocation", value: credential.revokedAt ? formatDate(credential.revokedAt) : "Not revoked" },
              { label: "Updated", value: formatDate(credential.updatedAt) },
              { label: "Anchor state", value: credential.anchorStatus.replace(/_/g, " ") },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className={`flex items-start justify-between gap-3 px-6 py-3.5 ${i < arr.length - 1 ? "border-b border-[hsl(var(--border-subtle))]" : ""}`}
              >
                <span className="meta-text shrink-0">{row.label}</span>
                <span className="text-right text-xs font-medium text-[hsl(var(--text-primary))] wrap-break-word max-w-[55%]">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(size: number | null) {
  if (!size) return "Not available";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}
