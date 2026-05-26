import { cookies } from "next/headers";

export interface InstitutionRecord {
  id: string;
  name: string;
  displayName: string | null;
  domain: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  wallet: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
}

export type AdminRole = "OWNER" | "SUPER_ADMIN" | "ADMIN" | "AUDITOR";

export interface AdminProfile {
  id: string;
  username: string | null;
  email: string;
  role: AdminRole;
  active: boolean;
  issuerId: string | null;
  createdAt: string;
  updatedAt: string;
  issuer: InstitutionRecord | null;
}

export interface TeamAdminRecord {
  id: string;
  username: string | null;
  email: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  institution: {
    id: string;
    name: string;
    displayName: string | null;
  } | null;
}

export interface CredentialMetadataRecord {
  version: 1;
  credentialId: string;
  verificationId: string;
  studentName: string;
  studentId: string;
  degree: string;
  issuedAt: string;
  verificationCode: string;
  signedVerificationToken: string;
  qrPayload: string;
  verificationMode: "CORE_REGISTRY" | "SECURE_PDF";
  securePdfEnabled: boolean;
  documentHash: string | null;
  revoked: boolean;
  revokedAt: string | null;
  revocationReason: string | null;
  verificationUrl: string;
  metadataUri: string;
  certificateUri: string | null;
  qrCodeUri: string;
  issuer: {
    id: string;
    name: string;
    displayName: string | null;
    domain: string;
    logoUrl: string | null;
    websiteUrl: string | null;
    status: InstitutionRecord["status"];
  };
}

export interface CredentialActivityRecord {
  id: string;
  type: "ISSUED" | "REVOKED" | "VERIFIED" | "BLOCKCHAIN";
  status:
    | "VALID"
    | "INVALID"
    | "REVOKED"
    | "NOT_FOUND"
    | "TAMPERED"
    | "PENDING"
    | "ANCHORED"
    | "FAILED"
    | "RETRYING";
  occurredAt: string;
  description: string;
}

export interface BlockchainAnchorLogRecord {
  id: string;
  operation: "ISSUANCE" | "REVOCATION" | "BATCH_ISSUANCE" | "DOCUMENT_PROOF";
  status: "PENDING" | "ANCHORED" | "FAILED" | "RETRYING" | "REVOKED";
  txHash: string | null;
  chainId: number | null;
  blockNumber: number | null;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialRecord {
  id: string;
  credentialExternalId: string;
  verificationId: string;
  verificationCode: string;
  signedVerificationToken: string;
  qrPayload: string;
  verificationMode: "CORE_REGISTRY" | "SECURE_PDF";
  securePdfEnabled: boolean;
  studentName: string;
  studentId: string;
  degree: string;
  metadataUri: string;
  metadata: CredentialMetadataRecord;
  qrCodeUri: string;
  certificateUri: string | null;
  verificationUrl: string;
  hash: string;
  registryHash: string;
  chainProofHash: string;
  documentHash: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  txHash: string | null;
  chainId: number | null;
  anchoredAt: string | null;
  blockNumber: number | null;
  anchorStatus: "PENDING" | "ANCHORED" | "FAILED";
  chainStatus: string;
  chainSyncedAt: string | null;
  anchorVersion: string;
  issuerWallet: string | null;
  chainVerificationMetadata: Record<string, unknown> | null;
  revocationTxHash: string | null;
  revoked: boolean;
  revokedAt: string | null;
  revokedBy: string | null;
  revokedByAdminId: string | null;
  revocationReason: string | null;
  revocationNotes: string | null;
  verificationCount: number;
  verifiedAt: string | null;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
  issuer: InstitutionRecord;
  blockchainLogs?: BlockchainAnchorLogRecord[];
  activities?: CredentialActivityRecord[];
}

export interface CredentialsResponse {
  total: number;
  items: CredentialRecord[];
}

export interface VerificationResponse {
  credentialExternalId: string | null;
  verificationId: string;
  verificationCode: string | null;
  verificationMode: "CORE_REGISTRY" | "SECURE_PDF" | null;
  securePdfEnabled: boolean;
  valid: boolean;
  result: "VALID" | "INVALID" | "REVOKED" | "NOT_FOUND" | "TAMPERED";
  revoked: boolean;
  revocationReason: string | null;
  metadataUri: string | null;
  qrCodeUri: string | null;
  certificateUri: string | null;
  verificationUrl: string | null;
  verificationCount: number;
  verifiedAt: string | null;
  issuer: {
    id: string;
    name: string;
    displayName: string | null;
    domain: string;
    logoUrl: string | null;
    websiteUrl: string | null;
    status: InstitutionRecord["status"];
  } | null;
  degree: string | null;
  issuedAt: string | null;
  revokedAt: string | null;
  blockchainVerified: boolean;
  blockchainStatus:
    | "ON_CHAIN_VERIFIED"
    | "ISSUER_UNAUTHORIZED"
    | "MISMATCH"
    | "NOT_ANCHORED"
    | "ARCHIVED_V1"
    | "FAILED"
    | "PENDING"
    | "UNAVAILABLE";
  txHash: string | null;
  blockNumber: number | null;
  anchoredAt: string | null;
  verifiedAtTimestamp?: string | null;
  credential: {
    id: string;
    verificationId?: string;
    verificationCode?: string;
    verificationMode?: "CORE_REGISTRY" | "SECURE_PDF";
    securePdfEnabled?: boolean;
    studentName: string;
    studentId: string;
    hash: string;
    documentHash: string | null;
  } | null;
  trustChecks: Array<{
    key: "integrity" | "issuer" | "chain" | "active";
    label: string;
    ok: boolean;
  }>;
}

export interface VerificationLogRecord {
  id: string;
  credentialId: string | null;
  eventType: "REGISTRY_CODE_LOOKUP" | "QR_LOOKUP" | "PDF_INTEGRITY_CHECK";
  lookupType: "QR" | "ID" | "DOCUMENT";
  uploadedHash: string | null;
  matched: boolean;
  status: string;
  ipAddress: string | null;
  createdAt: string;
  credential?: {
    id: string;
    verificationId: string;
    studentName: string;
    studentId: string;
    degree: string;
    revoked: boolean;
    issuer: {
      id: string;
      name: string;
      displayName: string | null;
      domain: string;
      status: InstitutionRecord["status"];
    };
  } | null;
}

export interface UploadVerificationResponse {
  status:
    | "INTEGRITY_VERIFIED"
    | "DOCUMENT_MODIFIED"
    | "NO_SECURE_PDF_RECORD"
    | "REVOKED"
    | "NOT_FOUND";
  credentialId?: string;
  verificationId?: string;
  studentName?: string;
  institution?: string;
  degree?: string;
  issuedAt?: string;
  verificationTimestamp?: string;
  verificationCount?: number;
  documentHash?: string | null;
  uploadedHash?: string;
  integrityMatched?: boolean;
  resolvedReference?: string | null;
  referenceSource?: "QR" | null;
  blockchainVerified: boolean;
  blockchainStatus:
    | "ON_CHAIN_VERIFIED"
    | "ISSUER_UNAUTHORIZED"
    | "MISMATCH"
    | "NOT_ANCHORED"
    | "ARCHIVED_V1"
    | "FAILED"
    | "PENDING"
    | "UNAVAILABLE";
  txHash: string | null;
  blockNumber: number | null;
  anchoredAt: string | null;
  trustChecks: Array<{
    key: "integrity" | "issuer" | "chain" | "active";
    label: string;
    ok: boolean;
  }>;
}

export interface DocumentProofRecord {
  id: string;
  proofExternalId: string;
  verificationId: string;
  verificationCode: string;
  signedVerificationToken: string;
  qrPayload: string;
  proofUrl: string;
  metadataUri: string;
  qrCodeUri: string;
  title: string;
  documentType: string;
  referenceNumber: string | null;
  documentDate: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sourceHash: string;
  txHash: string | null;
  chainId: number | null;
  anchoredAt: string | null;
  blockNumber: number | null;
  anchorStatus: string;
  chainStatus: string;
  chainSyncedAt: string | null;
  anchorVersion: string;
  issuerWallet: string | null;
  chainVerificationMetadata: Record<string, unknown> | null;
  revoked: boolean;
  revokedAt: string | null;
  revokedBy: string | null;
  revocationReason: string | null;
  verificationCount: number;
  verifiedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  issuer: InstitutionRecord;
  verificationLogs?: Array<{
    id: string;
    sourceType: "CODE_LOOKUP" | "QR_LOOKUP" | "PDF_UPLOAD";
    uploadedHash: string | null;
    matched: boolean;
    status: string;
    ipAddress: string | null;
    createdAt: string;
  }>;
}

export interface DocumentProofsResponse {
  total: number;
  items: DocumentProofRecord[];
}

export interface DocumentProofVerificationResponse {
  status: "AUTHENTIC" | "REVOKED" | "DOCUMENT_MODIFIED" | "NOT_FOUND";
  authentic: boolean;
  verificationId: string | null;
  verificationCode: string | null;
  proofUrl: string | null;
  metadataUri: string | null;
  qrCodeUri: string | null;
  title: string | null;
  documentType: string | null;
  referenceNumber: string | null;
  documentDate: string | null;
  issuedBy: string | null;
  verificationTimestamp: string;
  proofTimestamp: string | null;
  uploadedHash: string | null;
  registeredHash: string | null;
  integrityMatched: boolean;
  tamperDetected: boolean;
  revoked: boolean;
  revokedAt: string | null;
  revocationReason: string | null;
  verificationCount: number;
  blockchainVerified: boolean;
  blockchainStatus:
    | "ON_CHAIN_VERIFIED"
    | "ISSUER_UNAUTHORIZED"
    | "MISMATCH"
    | "NOT_ANCHORED"
    | "ARCHIVED_V1"
    | "FAILED"
    | "PENDING"
    | "UNAVAILABLE";
  txHash: string | null;
  blockNumber: number | null;
  anchoredAt: string | null;
  resolvedReference: string | null;
  trustChecks: Array<{
    key: "integrity" | "issuer" | "chain" | "active";
    label: string;
    ok: boolean;
  }>;
  issuer: VerificationResponse["issuer"];
}

export function getApiBaseUrl() {
  return process.env.INTERNAL_API_URL ?? process.env.API_BASE_URL ?? "http://localhost:4000/api";
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get("certiva_access_token")?.value;
}

export const INSTITUTION_SETUP_REQUIRED_CODE = "INSTITUTION_SETUP_REQUIRED";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isInstitutionSetupRequired(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === INSTITUTION_SETUP_REQUIRED_CODE) {
      return true;
    }

    return error.message.toLowerCase().includes("institution configuration");
  }

  return error instanceof Error
    ? error.message.toLowerCase().includes("institution configuration")
    : false;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string },
) {
  const headers = new Headers(init?.headers);

  if (init?.token) {
    headers.set("Authorization", `Bearer ${init.token}`);
  }

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Request failed";
    let code: string | undefined;

    try {
      const body = (await response.json()) as {
        message?: string | string[];
        code?: string;
      };
      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      } else {
        message = body.message ?? message;
      }

      if (typeof body.code === "string") {
        code = body.code;
      }
    } catch {
      message = response.statusText || message;
    }

    throw new ApiError(message, response.status, code);
  }

  return (await response.json()) as T;
}

export async function getCurrentAdmin(token: string) {
  return apiFetch<AdminProfile>("/auth/me", { token });
}

export async function getTeamAdmins(token: string) {
  return apiFetch<TeamAdminRecord[]>("/auth/admins", { token });
}

export async function getInstitution(token: string) {
  return apiFetch<InstitutionRecord>("/institution", { token });
}

export async function getCredentials(
  token: string,
  filters?: {
    studentId?: string;
    studentName?: string;
    revoked?: boolean;
  },
) {
  const searchParams = new URLSearchParams();

  if (filters?.studentId) {
    searchParams.set("studentId", filters.studentId);
  }

  if (filters?.studentName) {
    searchParams.set("studentName", filters.studentName);
  }

  if (typeof filters?.revoked === "boolean") {
    searchParams.set("revoked", String(filters.revoked));
  }

  const query = searchParams.toString();
  return apiFetch<CredentialsResponse>(
    `/credentials${query ? `?${query}` : ""}`,
    { token },
  );
}

export async function getCredential(token: string, id: string) {
  return apiFetch<CredentialRecord>(`/credentials/${id}`, { token });
}

export async function getVerificationLogs(token: string, limit = 50) {
  return apiFetch<VerificationLogRecord[]>(`/audit/logs?limit=${limit}`, {
    token,
  });
}

export interface BlockchainAuditRecord extends BlockchainAnchorLogRecord {
  credential: {
    id: string;
    verificationId: string;
    studentName: string;
    degree: string;
    anchorVersion: string;
    chainStatus: string;
    txHash: string | null;
    revocationTxHash: string | null;
    anchoredAt: string | null;
    revokedAt: string | null;
    issuerWallet: string | null;
    issuer: {
      id: string;
      name: string;
      displayName: string | null;
      domain: string;
    };
  };
}

export async function getBlockchainAudit(token: string, limit = 100) {
  return apiFetch<BlockchainAuditRecord[]>(`/audit/blockchain?limit=${limit}`, {
    token,
  });
}

export async function getDocumentProofs(token: string) {
  return apiFetch<DocumentProofsResponse>("/document-proofs", { token });
}

export async function getDocumentProof(token: string, id: string) {
  return apiFetch<DocumentProofRecord>(`/document-proofs/${id}`, { token });
}

// --- Dashboard audit APIs ----------------------------------------------------

export interface DashboardMetrics {
  totalIssued: number;
  totalVerified: number;
  revokedCount: number;
  pendingAnchor: number;
  successRate: number;
  activeCredentials: number;
}

export interface ActivityFeedItem {
  id: string;
  action: string;
  lookupType: "QR" | "ID" | "DOCUMENT";
  status: string;
  credentialId: string;
  credentialDbId: string | null;
  degree: string | null;
  studentName: string | null;
  institution: string | null;
  occurredAt: string;
  ipAddress: string | null;
  matched: boolean;
}

export interface ActivityFeedResponse {
  items: ActivityFeedItem[];
  total: number;
}

export interface AnalyticsBucket {
  date: string;
  total: number;
  valid: number;
  invalid: number;
}

export interface VerificationAnalytics {
  days: number;
  buckets: AnalyticsBucket[];
}

export interface LatestIssuanceRecord {
  id: string;
  credentialExternalId: string;
  degree: string;
  studentName: string;
  issuedAt: string;
  txHash: string | null;
  anchorStatus: string;
  anchorVersion: string;
  issuer: { id: string; name: string; displayName: string | null };
}

export interface LatestRevocationRecord {
  id: string;
  credentialExternalId: string;
  degree: string;
  studentName: string;
  revokedAt: string | null;
  revocationReason: string | null;
  revocationTxHash: string | null;
  revokedBy: string | null;
  issuer: { id: string; name: string; displayName: string | null };
}

export interface QueueHealthResponse {
  pending: number;
  processing: number;
  failed: number;
  completed: number;
  health: "healthy" | "warning" | "critical";
}

export async function getDashboardMetrics(token: string) {
  return apiFetch<DashboardMetrics>("/audit/dashboard/metrics", { token });
}

export async function getActivityFeed(
  token: string,
  options: { limit?: number; offset?: number } = {},
) {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));
  const qs = params.toString();
  return apiFetch<ActivityFeedResponse>(
    `/audit/dashboard/activity${qs ? `?${qs}` : ""}`,
    { token },
  );
}

export async function getVerificationAnalytics(
  token: string,
  days: 7 | 30 | 90 = 7,
) {
  return apiFetch<VerificationAnalytics>(
    `/audit/dashboard/analytics?days=${days}`,
    { token },
  );
}

export async function getLatestIssuances(token: string, limit = 10) {
  return apiFetch<LatestIssuanceRecord[]>(
    `/audit/dashboard/issuances?limit=${limit}`,
    { token },
  );
}

export async function getLatestRevocations(token: string, limit = 10) {
  return apiFetch<LatestRevocationRecord[]>(
    `/audit/dashboard/revocations?limit=${limit}`,
    { token },
  );
}

export async function getQueueHealth(token: string) {
  return apiFetch<QueueHealthResponse>("/audit/dashboard/queue", { token });
}

export function getDashboardExportUrl() {
  return `${getApiBaseUrl()}/audit/dashboard/export`;
}
