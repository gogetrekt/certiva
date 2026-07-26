"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useId, useState } from "react";

import type { SigningKeyRecord } from "../lib/api";
import { useLanguage } from "../lib/i18n";

/**
 * Read-only view of the institution's verification keys, plus the rotate action.
 * Deliberately non-technical: the UI says "verification code", never "Ed25519".
 */
export function InstitutionSigningKeys({
  keys,
  canRotate,
}: {
  keys: SigningKeyRecord[];
  canRotate: boolean;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const titleId = useId();
  const descriptionId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const s = t.forms.signingKeys;
  const active = keys.find((key) => key.active) ?? null;
  const retired = keys.filter((key) => !key.active);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  async function handleCopy(key: SigningKeyRecord) {
    try {
      await navigator.clipboard.writeText(key.publicKey);
      setCopiedKeyId(key.keyId);
    } catch {
      setError(s.copyFailed);
    }
  }

  async function handleRotate() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/institution/signing-keys/rotate", {
        method: "POST",
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? s.rotateFailed);
      }
      setIsOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : s.rotateFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="work-surface overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[hsl(var(--border-default))] px-5 py-4">
        <div>
          <p className="kicker mb-1.5">{s.kicker}</p>
          <h2 className="section-title">{s.title}</h2>
          <p className="body-text mt-1.5 max-w-2xl">{s.description}</p>
        </div>
        {canRotate ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsOpen(true);
            }}
            className="btn-ghost btn-sm"
          >
            {s.rotateAction}
          </button>
        ) : null}
      </div>

      <div className="space-y-4 px-5 py-5">
        {active ? (
          <KeyCard
            keyRecord={active}
            label={s.activeLabel}
            badgeClass="badge badge-valid"
            labels={s}
            copied={copiedKeyId === active.keyId}
            onCopy={() => void handleCopy(active)}
          />
        ) : (
          <p className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">
            {s.emptyState}
          </p>
        )}

        {retired.length > 0 ? (
          <div className="space-y-3">
            <p className="kicker">{s.retiredLabel}</p>
            {retired.map((key) => (
              <KeyCard
                key={key.keyId}
                keyRecord={key}
                label={s.retiredBadge}
                badgeClass="badge badge-neutral"
                labels={s}
                copied={copiedKeyId === key.keyId}
                onCopy={() => void handleCopy(key)}
              />
            ))}
            <p className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">
              {s.retiredNote}
            </p>
          </div>
        ) : null}

        {error && !isOpen ? (
          <p className="text-xs text-[hsl(var(--status-error-text))]">{error}</p>
        ) : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-[hsl(var(--bg-canvas))]/80 backdrop-blur-sm"
            onClick={() => {
              // Never dismiss mid-request: the rotation is already in flight.
              if (!isSubmitting) setIsOpen(false);
            }}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="relative w-full max-w-md rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] shadow-2xl"
          >
            <div className="border-b border-[hsl(var(--border-default))] px-6 py-5">
              <h3
                id={titleId}
                className="text-sm font-semibold text-[hsl(var(--text-primary))]"
              >
                {s.confirmTitle}
              </h3>
              <p
                id={descriptionId}
                className="mt-0.5 text-xs leading-5 text-[hsl(var(--text-tertiary))]"
              >
                {s.confirmBody}
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <ul className="space-y-1.5 rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-4 py-3">
                {s.confirmPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--text-quaternary))]"
                      aria-hidden
                    />
                    <span className="text-xs leading-5 text-[hsl(var(--text-secondary))]">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
              {error ? (
                <div className="rounded-lg border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-4 py-3 text-xs text-[hsl(var(--status-error-text))]">
                  {error}
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[hsl(var(--border-default))] px-6 py-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="btn-ghost btn-sm"
              >
                {s.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleRotate()}
                disabled={isSubmitting}
                className="btn-primary btn-sm"
              >
                {isSubmitting ? s.rotating : s.confirmAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function KeyCard({
  keyRecord,
  label,
  badgeClass,
  labels,
  copied,
  onCopy,
}: {
  keyRecord: SigningKeyRecord;
  label: string;
  badgeClass: string;
  labels: ReturnType<typeof useLanguage>["t"]["forms"]["signingKeys"];
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={badgeClass}>{label}</span>
        <span className="font-mono text-xs text-[hsl(var(--text-secondary))]">
          {keyRecord.keyId}
        </span>
      </div>

      <dl className="space-y-2">
        <div>
          <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-[hsl(var(--text-quaternary))]">
            {labels.publicKeyLabel}
          </dt>
          <dd className="mt-1 flex items-start gap-2">
            <code className="min-w-0 flex-1 break-all rounded border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-base))] p-2 font-mono text-[0.625rem] leading-4 text-[hsl(var(--text-secondary))]">
              {keyRecord.publicKey}
            </code>
            <button type="button" onClick={onCopy} className="btn-ghost btn-sm">
              {copied ? labels.copied : labels.copy}
            </button>
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <Meta
            term={labels.createdLabel}
            value={new Date(keyRecord.createdAt).toLocaleDateString()}
          />
          {keyRecord.revokedAt ? (
            <Meta
              term={labels.retiredAtLabel}
              value={new Date(keyRecord.revokedAt).toLocaleDateString()}
            />
          ) : null}
          <Meta
            term={labels.credentialsLabel}
            value={String(keyRecord._count.credentials)}
          />
        </div>
      </dl>
    </div>
  );
}

function Meta({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-[hsl(var(--text-quaternary))]">
        {term}
      </dt>
      <dd className="text-xs text-[hsl(var(--text-secondary))]">{value}</dd>
    </div>
  );
}
