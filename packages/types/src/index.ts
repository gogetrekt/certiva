export type InstitutionStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type IssuerStatus = InstitutionStatus;

export type AdminRole = "OWNER" | "SUPER_ADMIN" | "ADMIN" | "AUDITOR";

export type VerificationResult =
  | "VALID"
  | "INVALID"
  | "REVOKED"
  | "NOT_FOUND"
  | "TAMPERED";
export type AnchorStatus = "PENDING" | "ANCHORED" | "FAILED";
export type BlockchainProofStatus =
  | "ON_CHAIN_VERIFIED"
  | "ISSUER_UNAUTHORIZED"
  | "MISMATCH"
  | "NOT_ANCHORED"
  | "ARCHIVED_V1"
  | "FAILED"
  | "PENDING"
  | "UNAVAILABLE";
export type BlockchainOperation = "ANCHOR" | "REVOKE";

export type RevocationReason =
  | "DATA_CORRECTION"
  | "ISSUED_IN_ERROR"
  | "FRAUD_SUSPECTED"
  | "INSTITUTION_REQUEST"
  | "OTHER"
  | "LEGACY";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  | "ADMIN_CREATED"
  | "ADMIN_UPDATED"
  | "ADMIN_DISABLED"
  | "ADMIN_DELETED"
  | "ADMIN_ROLE_CHANGED"
  | "ADMIN_PASSWORD_CHANGED"
  | "CREDENTIAL_ISSUED"
  | "CREDENTIAL_REVOKED"
  | "CREDENTIAL_DELETED"
  | "DOCUMENT_PROOF_CREATED"
  | "DOCUMENT_PROOF_DELETED"
  | "SETTINGS_UPDATED"
  | "FORBIDDEN_ATTEMPT";

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

export interface RevokeCredentialRequest {
  reason: RevocationReason;
  notes?: string;
}
