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

const config: Record<StatusKind, { label: string; tone: BadgeTone }> = {
  ACTIVE:              { label: "Active",        tone: "valid" },
  VALID:               { label: "Valid",         tone: "valid" },
  AUTHENTIC:           { label: "Authentic",     tone: "valid" },
  ISSUED:              { label: "Issued",        tone: "valid" },
  ANCHORED:            { label: "Anchored",      tone: "valid" },
  ON_CHAIN_VERIFIED:   { label: "On-chain",      tone: "valid" },
  REVOKED:             { label: "Revoked",       tone: "warn" },
  SUSPENDED:           { label: "Suspended",     tone: "warn" },
  PENDING:             { label: "Pending",       tone: "warn" },
  RETRYING:            { label: "Retrying",      tone: "warn" },
  NOT_ANCHORED:        { label: "Not anchored",  tone: "warn" },
  DUPLICATE:           { label: "Duplicate",     tone: "warn" },
  EXISTS:              { label: "Exists",        tone: "warn" },
  INVALID:             { label: "Invalid",       tone: "error" },
  TAMPERED:            { label: "Tampered",      tone: "error" },
  DOCUMENT_MODIFIED:   { label: "Modified",      tone: "error" },
  NOT_FOUND:           { label: "Not found",     tone: "error" },
  FAILED:              { label: "Failed",        tone: "error" },
  ISSUER_UNAUTHORIZED: { label: "Unauthorized",  tone: "error" },
  MISMATCH:            { label: "Mismatch",      tone: "error" },
  INACTIVE:            { label: "Inactive",      tone: "neutral" },
  ARCHIVED_V1:         { label: "Archived",      tone: "neutral" },
  UNAVAILABLE:         { label: "Unavailable",   tone: "neutral" },
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
  const { label, tone } = config[status] ?? config.UNAVAILABLE;

  return (
    <span className={toneClass[tone]}>
      <span
        className={`h-1 w-1 shrink-0 rounded-full ${dotClass[tone]}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
