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

import {
  credentialRegistryAbi,
  POLYGON_AMOY_CHAIN_ID,
} from "./credential-registry.contract";

type CredentialWithIssuer = Credential & {
  issuer: Issuer;
};

interface BlockchainWriteResult {
  txHash: string | null;
  blockNumber: number | null;
  anchoredAt: Date | null;
  chainId: number;
  alreadyProcessed: boolean;
}

const rpcUrl = process.env.POLYGON_AMOY_RPC_URL?.trim();
const privateKey = process.env.PRIVATE_KEY?.trim() as Hex | undefined;
const contractAddress = process.env.CONTRACT_ADDRESS?.trim();
const timeoutMs = Number(process.env.BLOCKCHAIN_RPC_TIMEOUT_MS ?? 12000);

function assertConfigured() {
  if (!rpcUrl || !privateKey || !contractAddress) {
    throw new Error(
      "Blockchain worker is missing POLYGON_AMOY_RPC_URL, PRIVATE_KEY, or CONTRACT_ADDRESS.",
    );
  }
}

function getAccount() {
  assertConfigured();
  return privateKeyToAccount(privateKey!);
}

function getPublicClient() {
  assertConfigured();
  return createPublicClient({
    chain: polygonAmoy,
    transport: http(rpcUrl!, {
      timeout: timeoutMs,
    }),
  });
}

function getWalletClient() {
  assertConfigured();
  return createWalletClient({
    chain: polygonAmoy,
    account: getAccount(),
    transport: http(rpcUrl!, {
      timeout: timeoutMs,
    }),
  });
}

function normalizeAddress(value: string) {
  return getAddress(value) as Address;
}

function toBytes32ProofHash(proofHash: string | null) {
  const normalized = proofHash?.trim().toLowerCase();
  if (!normalized || !/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error("Credential chainProofHash must be a lowercase bytes32 value.");
  }

  return `0x${normalized}` as Hex;
}

async function readProof(credentialId: string) {
  const publicClient = getPublicClient();
  const [exists, documentHash, issuer, issuedAt, revocation] = await Promise.all([
    publicClient.readContract({
      address: normalizeAddress(contractAddress!),
      abi: credentialRegistryAbi,
      functionName: "credentialExists",
      args: [credentialId],
    }),
    publicClient.readContract({
      address: normalizeAddress(contractAddress!),
      abi: credentialRegistryAbi,
      functionName: "getCredentialHash",
      args: [credentialId],
    }),
    publicClient.readContract({
      address: normalizeAddress(contractAddress!),
      abi: credentialRegistryAbi,
      functionName: "getCredentialIssuer",
      args: [credentialId],
    }),
    publicClient.readContract({
      address: normalizeAddress(contractAddress!),
      abi: credentialRegistryAbi,
      functionName: "getCredentialTimestamp",
      args: [credentialId],
    }),
    publicClient.readContract({
      address: normalizeAddress(contractAddress!),
      abi: credentialRegistryAbi,
      functionName: "getCredentialRevocation",
      args: [credentialId],
    }),
  ]);
  const issuerAuthorized = exists
    ? await publicClient.readContract({
        address: normalizeAddress(contractAddress!),
        abi: credentialRegistryAbi,
        functionName: "isAuthorizedIssuer",
        args: [issuer],
      })
    : false;
  const [revoked, revokedAt, revokedBy] = revocation;

  return {
    documentHash,
    issuer,
    issuedAt,
    revoked,
    revokedAt,
    revokedBy,
    issuerAuthorized,
    exists,
  };
}

function assertIssuerWallet(credential: CredentialWithIssuer) {
  const issuerWallet = credential.issuer.wallet?.trim();
  if (!issuerWallet) {
    throw new Error("Issuer wallet is required for blockchain anchoring.");
  }

  if (!isAddressEqual(getAccount().address, normalizeAddress(issuerWallet))) {
    throw new Error("Issuer wallet does not match configured signing key.");
  }
}

export async function anchorCredentialOnChain(
  credential: CredentialWithIssuer,
): Promise<BlockchainWriteResult> {
  assertIssuerWallet(credential);
  const proof = await readProof(credential.id);
  const expectedHash = toBytes32ProofHash(credential.chainProofHash);
  const issuerWallet = normalizeAddress(credential.issuer.wallet!);

  if (proof.exists) {
    if (
      proof.documentHash === expectedHash &&
      isAddressEqual(proof.issuer as Address, issuerWallet) &&
      proof.issuerAuthorized &&
      !proof.revoked
    ) {
      return {
        txHash: credential.txHash ?? null,
        blockNumber: credential.blockNumber ?? null,
        anchoredAt: credential.anchoredAt ?? new Date(Number(proof.issuedAt) * 1000),
        chainId: POLYGON_AMOY_CHAIN_ID,
        alreadyProcessed: true,
      };
    }

    throw new Error("On-chain proof already exists with mismatched data.");
  }

  const publicClient = getPublicClient();
  const walletClient = getWalletClient();
  const { request } = await publicClient.simulateContract({
    address: normalizeAddress(contractAddress!),
    abi: credentialRegistryAbi,
    functionName: "anchorCredential",
    args: [credential.id, expectedHash],
    account: getAccount(),
    gas: 180_000n,
  });

  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });

  return {
    txHash,
    blockNumber: Number(receipt.blockNumber),
    anchoredAt: new Date(),
    chainId: POLYGON_AMOY_CHAIN_ID,
    alreadyProcessed: false,
  };
}

export async function revokeCredentialOnChain(
  credential: CredentialWithIssuer,
): Promise<BlockchainWriteResult> {
  assertIssuerWallet(credential);
  const proof = await readProof(credential.id);
  if (!proof.exists) {
    throw new Error("On-chain proof does not exist.");
  }

  if (proof.documentHash !== toBytes32ProofHash(credential.chainProofHash)) {
    throw new Error("On-chain proof hash mismatch detected.");
  }

  if (proof.revoked) {
    return {
      txHash: null,
      blockNumber: null,
      anchoredAt: credential.anchoredAt ?? new Date(Number(proof.issuedAt) * 1000),
      chainId: POLYGON_AMOY_CHAIN_ID,
      alreadyProcessed: true,
    };
  }

  const publicClient = getPublicClient();
  const walletClient = getWalletClient();
  const { request } = await publicClient.simulateContract({
    address: normalizeAddress(contractAddress!),
    abi: credentialRegistryAbi,
    functionName: "revokeCredential",
    args: [credential.id],
    account: getAccount(),
    gas: 90_000n,
  });

  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });

  return {
    txHash,
    blockNumber: Number(receipt.blockNumber),
    anchoredAt: credential.anchoredAt ?? new Date(Number(proof.issuedAt) * 1000),
    chainId: POLYGON_AMOY_CHAIN_ID,
    alreadyProcessed: false,
  };
}
