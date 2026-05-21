import { POLYGON_AMOY_CHAIN_ID } from "./credential-registry.contract";

export const BLOCKCHAIN_QUEUE_NAME = "credential-anchor";
export const BLOCKCHAIN_JOB_NAMES = {
  anchor: "ANCHOR_ISSUANCE",
  revoke: "REVOKE_CREDENTIAL",
  anchorBatch: "ANCHOR_BATCH",
  anchorDocumentProof: "ANCHOR_DOCUMENT_PROOF",
} as const;

export const ANCHOR_STATUS = {
  pending: "PENDING",
  anchored: "ANCHORED",
  failed: "FAILED",
} as const;

export const BLOCKCHAIN_PROOF_STATUS = {
  onChainVerified: "ON_CHAIN_VERIFIED",
  issuerUnauthorized: "ISSUER_UNAUTHORIZED",
  mismatch: "MISMATCH",
  notAnchored: "NOT_ANCHORED",
  archivedV1: "ARCHIVED_V1",
  failed: "FAILED",
  pending: "PENDING",
  unavailable: "UNAVAILABLE",
} as const;

export const BLOCKCHAIN_OPERATION = {
  anchor: "ISSUANCE",
  revoke: "REVOCATION",
  batchIssuance: "BATCH_ISSUANCE",
  documentProof: "DOCUMENT_PROOF",
} as const;

export const BLOCKCHAIN_JOB_ATTEMPTS = 5;
export const BLOCKCHAIN_QUEUE_BACKOFF_MS = 15_000;
export const BLOCKCHAIN_DEFAULT_CHAIN_ID = POLYGON_AMOY_CHAIN_ID;
