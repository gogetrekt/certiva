import type { Hex } from "viem";

import type {
  ANCHOR_STATUS,
  BLOCKCHAIN_OPERATION,
  BLOCKCHAIN_PROOF_STATUS,
} from "./blockchain.constants";

export type AnchorStatus =
  (typeof ANCHOR_STATUS)[keyof typeof ANCHOR_STATUS];

export type BlockchainProofStatus =
  (typeof BLOCKCHAIN_PROOF_STATUS)[keyof typeof BLOCKCHAIN_PROOF_STATUS];

export type BlockchainOperation =
  (typeof BLOCKCHAIN_OPERATION)[keyof typeof BLOCKCHAIN_OPERATION];

export interface BlockchainHealthCheck {
  ok: boolean;
  configured: boolean;
  chainId: number | null;
  latestBlock: number | null;
  contractAddress: string | null;
  signerAddress: string | null;
  error?: string;
}

export interface BlockchainProofRecord {
  credentialId: string;
  documentHash: Hex;
  issuer: string;
  issuerAuthorized: boolean;
  issuedAt: Date | null;
  revoked: boolean;
  revokedAt: Date | null;
  revokedBy: string | null;
  exists: boolean;
}

export interface BlockchainVerificationResult {
  blockchainStatus: BlockchainProofStatus;
  blockchainVerified: boolean;
  chainId: number | null;
  txHash: string | null;
  blockNumber: number | null;
  anchoredAt: Date | null;
  proof: BlockchainProofRecord | null;
}

export interface BlockchainWriteResult {
  txHash: string | null;
  blockNumber: number | null;
  anchoredAt: Date | null;
  chainId: number;
  alreadyProcessed: boolean;
  proof: BlockchainProofRecord | null;
}
