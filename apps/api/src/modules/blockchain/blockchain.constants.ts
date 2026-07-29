import { POLYGON_AMOY_CHAIN_ID } from './credential-registry.contract';

// Single source of truth for the operation values the API enqueues; the worker
// reads the same object from `@certiva/types`. Re-exported here so existing
// call sites keep importing blockchain constants from one place.
export { BLOCKCHAIN_OPERATION } from '@certiva/types';

// Likewise for the status values. `ANCHOR_STATUS` is what `anchorStatus` may
// hold; `CHAIN_STATUS` is the wider set `chainStatus` may hold. See the comments
// on both in `@certiva/types`.
export { ANCHOR_STATUS, CHAIN_STATUS } from '@certiva/types';

export const BLOCKCHAIN_QUEUE_NAME = 'credential-anchor';
export const BLOCKCHAIN_JOB_NAMES = {
  anchor: 'ANCHOR_ISSUANCE',
  revoke: 'REVOKE_CREDENTIAL',
  anchorBatch: 'ANCHOR_BATCH',
  anchorDocumentProof: 'ANCHOR_DOCUMENT_PROOF',
} as const;

export const BLOCKCHAIN_PROOF_STATUS = {
  onChainVerified: 'ON_CHAIN_VERIFIED',
  issuerUnauthorized: 'ISSUER_UNAUTHORIZED',
  mismatch: 'MISMATCH',
  notAnchored: 'NOT_ANCHORED',
  archivedV1: 'ARCHIVED_V1',
  failed: 'FAILED',
  pending: 'PENDING',
  unavailable: 'UNAVAILABLE',
} as const;

export const BLOCKCHAIN_JOB_ATTEMPTS = 5;
export const BLOCKCHAIN_QUEUE_BACKOFF_MS = 15_000;
export const BLOCKCHAIN_DEFAULT_CHAIN_ID = POLYGON_AMOY_CHAIN_ID;
