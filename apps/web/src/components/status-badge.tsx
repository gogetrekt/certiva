"use client";

import { useLanguage } from "../lib/i18n";

type StatusKind =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "VALID"
  | "AUTHENTIC"
  | "INVALID"
  | "REVOKED"
  | "TAMPERED"
  | "DOCUMENT_MODIFIED"
  | "NOT_FOUND"
  | "DUPLICATE"
  | "EXISTS"
  | "ISSUED"
  | "ANCHORED"
  | "PENDING"
  | "FAILED"
  | "RETRYING"
  | "ON_CHAIN_VERIFIED"
  | "ISSUER_UNAUTHORIZED"
  | "MISMATCH"
  | "NOT_ANCHORED"
  | "ARCHIVED_V1"
  | "UNAVAILABLE";

type BadgeTone = "valid" | "warn" | "error" | "neutral";

const config: Record<StatusKind, { labelKey: keyof ReturnType<typeof getStatusLabels>; tone: BadgeTone }> = {
  ACTIVE:              { labelKey: "active",       tone: "valid" },
  VALID:               { labelKey: "valid",        tone: "valid" },
  AUTHENTIC:           { labelKey: "authentic",    tone: "valid" },
  ISSUED:              { labelKey: "issued",       tone: "valid" },
  ANCHORED:            { labelKey: "anchored",     tone: "valid" },
  ON_CHAIN_VERIFIED:   { labelKey: "onChain",      tone: "valid" },
  REVOKED:             { labelKey: "revoked",      tone: "warn" },
  SUSPENDED:           { labelKey: "suspended",    tone: "warn" },
  PENDING:             { labelKey: "pending",      tone: "warn" },
  RETRYING:            { labelKey: "retrying",     tone: "warn" },
  NOT_ANCHORED:        { labelKey: "notAnchored",  tone: "warn" },
  DUPLICATE:           { labelKey: "duplicate",    tone: "warn" },
  EXISTS:              { labelKey: "exists",       tone: "warn" },
  INVALID:             { labelKey: "invalid",      tone: "error" },
  TAMPERED:            { labelKey: "tampered",     tone: "error" },
  DOCUMENT_MODIFIED:   { labelKey: "modified",     tone: "error" },
  NOT_FOUND:           { labelKey: "notFound",     tone: "error" },
  FAILED:              { labelKey: "failed",       tone: "error" },
  ISSUER_UNAUTHORIZED: { labelKey: "unauthorized", tone: "error" },
  MISMATCH:            { labelKey: "mismatch",     tone: "error" },
  INACTIVE:            { labelKey: "inactive",     tone: "neutral" },
  ARCHIVED_V1:         { labelKey: "archived",     tone: "neutral" },
  UNAVAILABLE:         { labelKey: "unavailable",  tone: "neutral" },
};

const toneClass: Record<BadgeTone, string> = {
  valid:   "badge badge-valid",
  warn:    "badge badge-warn",
  error:   "badge badge-error",
  neutral: "badge badge-neutral",
};

const dotClass: Record<BadgeTone, string> = {
  valid:   "dot-valid",
  warn:    "dot-warn",
  error:   "dot-error",
  neutral: "dot-neutral",
};

export function StatusBadge({ status }: { status: StatusKind }) {
  const { t } = useLanguage();
  const labels = getStatusLabels(t);
  const { labelKey, tone } = config[status] ?? config.UNAVAILABLE;

  return (
    <span className={toneClass[tone]}>
      <span
        className={`h-1 w-1 shrink-0 rounded-full ${dotClass[tone]}`}
        aria-hidden="true"
      />
      {labels[labelKey]}
    </span>
  );
}

function getStatusLabels(t: ReturnType<typeof useLanguage>["t"]) {
  return {
    active: t.common.active,
    valid: t.common.valid,
    authentic: t.common.authentic,
    issued: t.common.issued,
    anchored: t.common.anchored,
    onChain: t.common.onChain,
    revoked: t.common.revoked,
    suspended: t.common.suspended,
    pending: t.common.pending,
    retrying: t.common.retrying,
    notAnchored: t.common.notAnchored,
    duplicate: t.common.duplicate,
    exists: t.common.exists,
    invalid: t.common.invalid,
    tampered: t.common.tampered,
    modified: t.common.modified,
    notFound: t.common.notFound,
    failed: t.common.failed,
    unauthorized: t.common.unauthorized,
    mismatch: t.common.mismatch,
    inactive: t.common.inactive,
    archived: t.common.archived,
    unavailable: t.common.unavailable,
  };
}
