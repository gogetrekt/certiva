"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowSquareOut } from "@phosphor-icons/react";

interface QrCodeCardProps {
  verificationId: string;
  verificationUrl: string;
  qrCodeUri?: string;
  label?: string;
  size?: number;
}

export function QrCodeCard({
  verificationId,
  verificationUrl,
  qrCodeUri,
  label = "Credential Verification QR",
  size = 180,
}: QrCodeCardProps) {
  const normalizedVerificationUrl = normalizeVerificationUrl(verificationId, verificationUrl);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function generateQrCode() {
      try {
        const url = await QRCode.toDataURL(normalizedVerificationUrl, {
          width: size,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#18181b", light: "#fafafa" },
        });

        if (isActive) {
          setDataUrl(url);
          setError(null);
        }
      } catch (caughtError) {
        if (isActive) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to generate QR code.");
        }
      }
    }

    void generateQrCode();
    return () => { isActive = false; };
  }, [normalizedVerificationUrl, size]);

  return (
    <div className="work-surface overflow-hidden p-0">
      <div className="border-b border-[hsl(var(--border-default))] px-5 py-4">
        <p className="kicker">{label}</p>
        <p className="mt-0.5 text-xs text-[hsl(var(--text-tertiary))]">Scan to open the public credential verification page. To verify document integrity, upload a PDF on the verification page.</p>
      </div>
      <div className="flex flex-col sm:flex-row items-start gap-5 p-5">
        <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] p-3">
          {dataUrl ? (
            <img src={dataUrl} alt={`Verification QR for ${verificationId}`} className="h-full w-full" />
          ) : (
            <div className="skeleton h-full w-full rounded-md" />
          )}
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <p className="kicker mb-1.5">Verification URL</p>
            <p className="hash-text wrap-break-word leading-5">
              {normalizedVerificationUrl}
            </p>
          </div>
          {error ? <p className="text-xs text-[hsl(var(--status-error-text))]">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <a
              href={normalizedVerificationUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost btn-sm inline-flex items-center gap-1.5"
            >
              Open verification
              <ArrowSquareOut size={11} />
            </a>
            <a
              href={qrCodeUri?.trim() || dataUrl || normalizedVerificationUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-[hsl(var(--border-subtle))] bg-transparent px-3 py-1.5 text-xs font-medium text-[hsl(var(--text-tertiary))] transition-colors hover:border-[hsl(var(--border-default))] hover:text-[hsl(var(--text-secondary))]"
            >
              Open QR asset
              <ArrowSquareOut size={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeVerificationUrl(verificationId: string, verificationUrl: string) {
  const normalized = verificationUrl.trim();
  if (normalized) return normalized;

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");

  if (baseUrl) {
    return new URL(`/verify/${encodeURIComponent(verificationId)}`, baseUrl).toString();
  }

  return `/verify/${encodeURIComponent(verificationId)}`;
}
