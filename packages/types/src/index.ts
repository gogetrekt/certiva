// No consumer outside this package today. Kept, not deleted: it mirrors a
// value that exists in schema.prisma / the API contract, and a shared types
// package is expected to describe the whole contract rather than only the
// parts currently imported.
export type InstitutionStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type IssuerStatus = InstitutionStatus;

export type AdminRole = "OWNER" | "SUPER_ADMIN" | "ADMIN" | "AUDITOR";

// No consumer outside this package today. Kept, not deleted: it mirrors a
// value that exists in schema.prisma / the API contract, and a shared types
// package is expected to describe the whole contract rather than only the
// parts currently imported.
export type VerificationResult =
  | "VALID"
  | "INVALID"
  | "REVOKED"
  | "NOT_FOUND"
  | "TAMPERED";
/**
 * What `anchorStatus` can hold: the lifecycle of the anchoring write itself.
 * The values used to be written out as a union here and duplicated as a const
 * object in both the API and the worker, which is how the worker ended up
 * writing a status (`REVOKE_FAILED`) that this file had never heard of.
 */
export const ANCHOR_STATUS = {
  pending: "PENDING",
  anchored: "ANCHORED",
  failed: "FAILED",
} as const;

export type AnchorStatus = (typeof ANCHOR_STATUS)[keyof typeof ANCHOR_STATUS];

/**
 * What `chainStatus` can hold. It is the wider column: on top of the anchoring
 * lifecycle it carries the two ways a revocation fails to land on chain, which
 * `anchorStatus` must never take — a credential whose revoke failed is still
 * anchored, and overwriting that would erase the fact.
 *
 * Those two are deliberately separate values. `REVOKE_FAILED` means the job
 * reached the worker and every on-chain attempt failed. `REVOKE_ENQUEUE_FAILED`
 * means the job never got queued, so nothing was ever attempted on chain.
 * Collapsing them would tell whoever investigates the incident later that a
 * chain write was tried when none ever was.
 */
export const CHAIN_STATUS = {
  ...ANCHOR_STATUS,
  revokeFailed: "REVOKE_FAILED",
  revokeEnqueueFailed: "REVOKE_ENQUEUE_FAILED",
} as const;

// No consumer outside this package today. Kept, not deleted: it mirrors a
// value that exists in schema.prisma / the API contract, and a shared types
// package is expected to describe the whole contract rather than only the
// parts currently imported.
export type ChainStatus = (typeof CHAIN_STATUS)[keyof typeof CHAIN_STATUS];
export type BlockchainProofStatus =
  | "ON_CHAIN_VERIFIED"
  | "ISSUER_UNAUTHORIZED"
  | "MISMATCH"
  | "NOT_ANCHORED"
  | "ARCHIVED_V1"
  | "FAILED"
  | "PENDING"
  | "UNAVAILABLE";
/**
 * The operations the API actually enqueues onto the blockchain queue. The type
 * is derived from the values rather than written out beside them: it used to be
 * a hand-written `"ANCHOR" | "REVOKE"` that matched nothing the API sends, which
 * made every comparison in the worker a TS2367 error nobody saw.
 */
export const BLOCKCHAIN_OPERATION = {
  anchor: "ISSUANCE",
  revoke: "REVOCATION",
  batchIssuance: "BATCH_ISSUANCE",
  documentProof: "DOCUMENT_PROOF",
} as const;

export type BlockchainOperation =
  (typeof BLOCKCHAIN_OPERATION)[keyof typeof BLOCKCHAIN_OPERATION];

export type RevocationReason =
  | "DATA_CORRECTION"
  | "ISSUED_IN_ERROR"
  | "FRAUD_SUSPECTED"
  | "INSTITUTION_REQUEST"
  | "OTHER"
  | "LEGACY";

/**
 * Must match the `AuditAction` enum in apps/api/prisma/schema.prisma exactly.
 *
 * This is a const object rather than a bare union, following BLOCKCHAIN_OPERATION
 * above, so the values exist at runtime and the two definitions can actually be
 * compared. `audit-action-parity.spec.ts` in the API asserts that comparison
 * against the Prisma client, which is the only place both sides are visible;
 * without it this list silently drifted and lost SIGNING_KEY_GENERATED and
 * SIGNING_KEY_ROTATED, both of which are written in production code.
 */
export const AUDIT_ACTION = {
  loginSuccess: "LOGIN_SUCCESS",
  loginFailure: "LOGIN_FAILURE",
  // No writer, deliberately: logout happens entirely in the web app, which
  // clears the session cookie without calling the API.
  logout: "LOGOUT",
  adminCreated: "ADMIN_CREATED",
  adminUpdated: "ADMIN_UPDATED",
  adminDisabled: "ADMIN_DISABLED",
  adminDeleted: "ADMIN_DELETED",
  adminRoleChanged: "ADMIN_ROLE_CHANGED",
  // No writer, and it marks a missing feature rather than a missing log line:
  // the API has no change-password endpoint at all.
  adminPasswordChanged: "ADMIN_PASSWORD_CHANGED",
  credentialIssued: "CREDENTIAL_ISSUED",
  credentialRevoked: "CREDENTIAL_REVOKED",
  credentialDeleted: "CREDENTIAL_DELETED",
  documentProofCreated: "DOCUMENT_PROOF_CREATED",
  documentProofDeleted: "DOCUMENT_PROOF_DELETED",
  signingKeyGenerated: "SIGNING_KEY_GENERATED",
  signingKeyRotated: "SIGNING_KEY_ROTATED",
  settingsUpdated: "SETTINGS_UPDATED",
  forbiddenAttempt: "FORBIDDEN_ATTEMPT",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

// No consumer outside this package today. Kept, not deleted: it mirrors a
// value that exists in schema.prisma / the API contract, and a shared types
// package is expected to describe the whole contract rather than only the
// parts currently imported.
export type Permission =
  | "ADMIN_MANAGE"
  | "ADMIN_READ"
  | "CREDENTIAL_CREATE"
  | "CREDENTIAL_READ"
  | "CREDENTIAL_UPDATE"
  | "CREDENTIAL_REVOKE"
  | "CREDENTIAL_DELETE"
  | "DOCUMENT_PROOF_READ"
  | "DOCUMENT_PROOF_CREATE"
  | "DOCUMENT_PROOF_DELETE"
  | "VERIFICATION_LOG_READ"
  | "AUDIT_LOG_READ"
  | "SETTINGS_READ"
  | "SETTINGS_UPDATE";

export interface JwtPayload {
  sub: string;
  username: string | null;
  email: string;
  role: AdminRole;
  issuerId: string | null;
  tokenVersion: number;
  active?: boolean;
}

export interface Institution {
  id: string;
  name: string;
  displayName: string | null;
  domain: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  wallet: string | null;
  status: InstitutionStatus;
  createdAt: string;
}
export type Issuer = Institution;

export interface Credential {
  id: string;
  studentName: string;
  studentId: string;
  degree: string;
  metadataUri: string;
  metadataJson: Record<string, unknown>;
  qrCodeUri: string;
  certificateUri: string;
  verificationUrl: string;
  hash: string;
  documentHash: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  txHash: string | null;
  chainId: number | null;
  anchoredAt: string | null;
  blockNumber: number | null;
  anchorStatus: AnchorStatus;
  chainStatus: string;
  chainSyncedAt: string | null;
  anchorVersion: string;
  issuerWallet: string | null;
  revocationTxHash: string | null;
  revoked: boolean;
  revokedAt: string | null;
  revokedBy: string | null;
  revokedByAdminId: string | null;
  revocationReason: RevocationReason | null;
  revocationNotes: string | null;
  verificationCount: number;
  verifiedAt: string | null;
  issuedAt: string;
  issuerId: string;
}

export interface Admin {
  id: string;
  username: string | null;
  email: string;
  role: AdminRole;
  active: boolean;
  issuerId: string | null;
}

export interface VerificationLog {
  id: string;
  credentialId: string | null;
  uploadedHash: string | null;
  matched: boolean;
  status: VerificationResult;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  actorAdminId: string | null;
  actorUsername: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// No consumer outside this package today. Kept, not deleted: it mirrors a
// value that exists in schema.prisma / the API contract, and a shared types
// package is expected to describe the whole contract rather than only the
// parts currently imported.
export interface BlockchainAnchorLog {
  id: string;
  credentialId: string;
  operation: BlockchainOperation;
  status: string;
  txHash: string | null;
  chainId: number | null;
  blockNumber: number | null;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssuanceJobPayload {
  credentialId: string;
  issuerId: string;
  requestedBy: string;
}

export interface RetryJobPayload {
  jobId: string;
  reason?: string;
  attempts: number;
}

export interface CredentialAnchorJobPayload {
  credentialId: string;
  operation: BlockchainOperation;
}

// No consumer outside this package today. Kept, not deleted: it mirrors a
// value that exists in schema.prisma / the API contract, and a shared types
// package is expected to describe the whole contract rather than only the
// parts currently imported.
export interface RevokeCredentialRequest {
  reason: RevocationReason;
  notes?: string;
}
