import { Injectable } from "@nestjs/common";
import type { Credential, Issuer } from "@prisma/client";
import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  isAddressEqual,
} from "viem";
import { polygonAmoy } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

import { AppConfigService } from "../../config/app-config.service";
import {
  ANCHOR_STATUS,
  BLOCKCHAIN_DEFAULT_CHAIN_ID,
  BLOCKCHAIN_PROOF_STATUS,
} from "./blockchain.constants";
import {
  credentialRegistryAbi,
  POLYGON_AMOY_CHAIN_ID,
} from "./credential-registry.contract";
import type {
  BlockchainHealthCheck,
  BlockchainProofRecord,
  BlockchainVerificationResult,
  BlockchainWriteResult,
} from "./blockchain.types";

type CredentialWithIssuer = Credential & {
  issuer: Issuer;
};

interface AnchorableRecord {
  id: string;
  chainProofHash: string;
  txHash: string | null;
  blockNumber: number | null;
  anchoredAt: Date | null;
  anchorStatus: string;
  anchorVersion: string;
  issuer: {
    wallet: string | null;
  };
}

@Injectable()
export class BlockchainService {
  constructor(private readonly configService: AppConfigService) {}

  async anchorCredential(
    credential: CredentialWithIssuer,
  ): Promise<BlockchainWriteResult> {
    return this.anchorRecord(credential);
  }

  async revokeCredential(
    credential: CredentialWithIssuer,
  ): Promise<BlockchainWriteResult> {
    this.assertBlockchainConfigured();
    this.assertIssuerWallet(credential);

    const proof = await this.readProof(credential.id);
    if (!proof?.exists) {
      throw new Error("On-chain credential proof does not exist.");
    }

    if (proof.documentHash !== this.toBytes32ProofHash(credential.chainProofHash)) {
      throw new Error("On-chain proof hash mismatch detected.");
    }

    if (proof.revoked) {
      return {
        txHash: null,
        blockNumber: null,
        anchoredAt: credential.anchoredAt ?? proof.issuedAt,
        chainId: BLOCKCHAIN_DEFAULT_CHAIN_ID,
        alreadyProcessed: true,
        proof,
      };
    }

    const publicClient = this.getPublicClient();
    const walletClient = this.getWalletClient();
    const account = this.getAccount();
    const contractAddress = this.getContractAddress();
    const { request } = await publicClient.simulateContract({
      address: contractAddress,
      abi: credentialRegistryAbi,
      functionName: "revokeCredential",
      args: [credential.id],
      account,
      gas: 90_000n,
    });

    const txHash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });
    const confirmedProof = await this.readProof(credential.id);

    return {
      txHash,
      blockNumber: Number(receipt.blockNumber),
      anchoredAt: credential.anchoredAt ?? proof.issuedAt,
      chainId: BLOCKCHAIN_DEFAULT_CHAIN_ID,
      alreadyProcessed: false,
      proof: confirmedProof,
    };
  }

  async verifyCredential(
    credential: CredentialWithIssuer,
  ): Promise<BlockchainVerificationResult> {
    return this.verifyRecord(credential);
  }

  async anchorRecord(record: AnchorableRecord): Promise<BlockchainWriteResult> {
    this.assertBlockchainConfigured();
    this.assertIssuerWallet(record);

    const proof = await this.readProof(record.id);
    const expectedDocumentHash = this.toBytes32ProofHash(record.chainProofHash);
    const issuerAddress = this.normalizeAddress(record.issuer.wallet!);

    if (proof?.exists) {
      if (
        proof.documentHash === expectedDocumentHash &&
        isAddressEqual(proof.issuer as Address, issuerAddress) &&
        proof.issuerAuthorized &&
        !proof.revoked
      ) {
        return {
          txHash: record.txHash ?? null,
          blockNumber: record.blockNumber ?? null,
          anchoredAt: record.anchoredAt ?? proof.issuedAt,
          chainId: BLOCKCHAIN_DEFAULT_CHAIN_ID,
          alreadyProcessed: true,
          proof,
        };
      }

      throw new Error("On-chain proof already exists with mismatched data.");
    }

    const publicClient = this.getPublicClient();
    const walletClient = this.getWalletClient();
    const account = this.getAccount();
    const contractAddress = this.getContractAddress();

    const { request } = await publicClient.simulateContract({
      address: contractAddress,
      abi: credentialRegistryAbi,
      functionName: "anchorCredential",
      args: [record.id, expectedDocumentHash],
      account,
      gas: 180_000n,
    });

    const txHash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });
    const confirmedProof = await this.readProof(record.id);

    return {
      txHash,
      blockNumber: Number(receipt.blockNumber),
      anchoredAt: new Date(),
      chainId: BLOCKCHAIN_DEFAULT_CHAIN_ID,
      alreadyProcessed: false,
      proof: confirmedProof,
    };
  }

  async verifyRecord(record: AnchorableRecord): Promise<BlockchainVerificationResult> {
    if (!this.isConfigured()) {
      return {
        blockchainStatus:
          record.anchorStatus === ANCHOR_STATUS.pending
            ? BLOCKCHAIN_PROOF_STATUS.pending
            : BLOCKCHAIN_PROOF_STATUS.unavailable,
        blockchainVerified: false,
        chainId: null,
        txHash: record.txHash ?? null,
        blockNumber: record.blockNumber ?? null,
        anchoredAt: record.anchoredAt ?? null,
        proof: null,
      };
    }

    try {
      const proof = await this.readProof(record.id);
      if (!proof?.exists) {
        if (record.anchorVersion === "V1" && record.txHash) {
          return {
            blockchainStatus: BLOCKCHAIN_PROOF_STATUS.archivedV1,
            blockchainVerified: false,
            chainId: null,
            txHash: record.txHash,
            blockNumber: record.blockNumber,
            anchoredAt: record.anchoredAt,
            proof: null,
          };
        }

        return {
          blockchainStatus:
            record.anchorStatus === ANCHOR_STATUS.failed
              ? BLOCKCHAIN_PROOF_STATUS.failed
              : record.anchorStatus === ANCHOR_STATUS.pending
                ? BLOCKCHAIN_PROOF_STATUS.pending
                : BLOCKCHAIN_PROOF_STATUS.notAnchored,
          blockchainVerified: false,
          chainId: POLYGON_AMOY_CHAIN_ID,
          txHash: record.txHash ?? null,
          blockNumber: record.blockNumber ?? null,
          anchoredAt: record.anchoredAt ?? null,
          proof: null,
        };
      }

      const issuerMatches = record.issuer.wallet
        ? isAddressEqual(
            proof.issuer as Address,
            this.normalizeAddress(record.issuer.wallet),
          )
        : false;
      const hashMatches =
        proof.documentHash === this.toBytes32ProofHash(record.chainProofHash);

      const blockchainVerified =
        issuerMatches && hashMatches && proof.issuerAuthorized && !proof.revoked;

      return {
        blockchainStatus: blockchainVerified
          ? BLOCKCHAIN_PROOF_STATUS.onChainVerified
          : !proof.issuerAuthorized
            ? BLOCKCHAIN_PROOF_STATUS.issuerUnauthorized
            : BLOCKCHAIN_PROOF_STATUS.mismatch,
        blockchainVerified,
        chainId: POLYGON_AMOY_CHAIN_ID,
        txHash: record.txHash ?? null,
        blockNumber: record.blockNumber ?? null,
        anchoredAt: record.anchoredAt ?? proof.issuedAt,
        proof,
      };
    } catch {
      return {
        blockchainStatus: BLOCKCHAIN_PROOF_STATUS.unavailable,
        blockchainVerified: false,
        chainId: null,
        txHash: record.txHash ?? null,
        blockNumber: record.blockNumber ?? null,
        anchoredAt: record.anchoredAt ?? null,
        proof: null,
      };
    }
  }

  async healthCheck(): Promise<BlockchainHealthCheck> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        configured: false,
        chainId: null,
        latestBlock: null,
        contractAddress: this.configService.blockchainContractAddress,
        signerAddress: null,
        error: "Blockchain environment is not fully configured.",
      };
    }

    try {
      const publicClient = this.getPublicClient();
      const [chainId, latestBlock] = await Promise.all([
        publicClient.getChainId(),
        publicClient.getBlockNumber(),
      ]);

      return {
        ok: true,
        configured: true,
        chainId,
        latestBlock: Number(latestBlock),
        contractAddress: this.getContractAddress(),
        signerAddress: this.getAccount().address,
      };
    } catch (error) {
      return {
        ok: false,
        configured: true,
        chainId: null,
        latestBlock: null,
        contractAddress: this.configService.blockchainContractAddress,
        signerAddress: this.getAccount().address,
        error: error instanceof Error ? error.message : "Unable to reach Polygon Amoy RPC.",
      };
    }
  }

  toBytes32ProofHash(proofHash: string | null): Hex {
    const normalized = proofHash?.trim().toLowerCase();
    if (!normalized || !/^[a-f0-9]{64}$/.test(normalized)) {
      throw new Error("Credential proof hash is not a valid bytes32 hex value.");
    }

    return `0x${normalized}` as Hex;
  }

  isConfigured() {
    return Boolean(
      this.configService.blockchainRpcUrl &&
        this.configService.blockchainPrivateKey &&
        this.configService.blockchainContractAddress,
    );
  }

  private assertBlockchainConfigured() {
    if (!this.isConfigured()) {
      throw new Error("Blockchain anchoring is not configured.");
    }
  }

  private assertIssuerWallet(record: AnchorableRecord) {
    const issuerWallet = record.issuer.wallet?.trim();
    if (!issuerWallet) {
      throw new Error("Issuer wallet is required before anchoring credentials.");
    }

    if (!isAddressEqual(this.getAccount().address, this.normalizeAddress(issuerWallet))) {
      throw new Error("Issuer wallet does not match the configured signing key.");
    }
  }

  private async readProof(credentialId: string) {
    const publicClient = this.getPublicClient();
    const contractAddress = this.getContractAddress();
    const [exists, documentHash, issuer, issuedAt, revocation] =
      await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: credentialRegistryAbi,
          functionName: "credentialExists",
          args: [credentialId],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: credentialRegistryAbi,
          functionName: "getCredentialHash",
          args: [credentialId],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: credentialRegistryAbi,
          functionName: "getCredentialIssuer",
          args: [credentialId],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: credentialRegistryAbi,
          functionName: "getCredentialTimestamp",
          args: [credentialId],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: credentialRegistryAbi,
          functionName: "getCredentialRevocation",
          args: [credentialId],
        }),
      ]);

    const issuerAuthorized = exists
      ? await publicClient.readContract({
          address: contractAddress,
          abi: credentialRegistryAbi,
          functionName: "isAuthorizedIssuer",
          args: [issuer],
        })
      : false;
    const [revoked, revokedAt, revokedBy] = revocation;

    return this.toProofRecord({
      credentialId,
      documentHash,
      issuer,
      issuedAt,
      issuerAuthorized,
      revoked,
      revokedAt,
      revokedBy,
      exists,
    });
  }

  private toProofRecord(input: {
    credentialId: string;
    documentHash: Hex;
    issuer: string;
    issuedAt: bigint;
    issuerAuthorized: boolean;
    revoked: boolean;
    revokedAt: bigint;
    revokedBy: string;
    exists: boolean;
  }): BlockchainProofRecord | null {
    if (!input.exists) {
      return null;
    }

    return {
      credentialId: input.credentialId,
      documentHash: input.documentHash,
      issuer: input.issuer,
      issuerAuthorized: input.issuerAuthorized,
      issuedAt:
        input.issuedAt > 0n
          ? new Date(Number(input.issuedAt) * 1000)
          : null,
      revoked: input.revoked,
      revokedAt:
        input.revokedAt > 0n
          ? new Date(Number(input.revokedAt) * 1000)
          : null,
      revokedBy:
        input.revokedBy && input.revokedBy !== "0x0000000000000000000000000000000000000000"
          ? input.revokedBy
          : null,
      exists: input.exists,
    };
  }

  private getPublicClient() {
    const url = this.configService.blockchainRpcUrl;
    if (!url) {
      throw new Error("POLYGON_AMOY_RPC_URL is not configured.");
    }

    return createPublicClient({
      chain: polygonAmoy,
      transport: http(url, {
        timeout: this.configService.blockchainRpcTimeoutMs,
      }),
    });
  }

  private getWalletClient() {
    const url = this.configService.blockchainRpcUrl;
    if (!url) {
      throw new Error("POLYGON_AMOY_RPC_URL is not configured.");
    }

    return createWalletClient({
      chain: polygonAmoy,
      account: this.getAccount(),
      transport: http(url, {
        timeout: this.configService.blockchainRpcTimeoutMs,
      }),
    });
  }

  private getAccount() {
    const privateKey = this.configService.blockchainPrivateKey;
    if (!privateKey) {
      throw new Error("PRIVATE_KEY is not configured.");
    }

    return privateKeyToAccount(privateKey as Hex);
  }

  private getContractAddress() {
    const contractAddress = this.configService.blockchainContractAddress;
    if (!contractAddress) {
      throw new Error("CONTRACT_ADDRESS is not configured.");
    }

    return this.normalizeAddress(contractAddress);
  }

  private normalizeAddress(address: string) {
    return getAddress(address) as Address;
  }
}
