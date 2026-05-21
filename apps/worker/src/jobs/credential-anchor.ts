import type { Job } from "bullmq";
import { Prisma } from "@prisma/client";
import type { CredentialAnchorJobPayload } from "@certiva/types";

import { prisma } from "../lib/prisma";
import {
  anchorCredentialOnChain,
  revokeCredentialOnChain,
} from "../lib/blockchain";

const ANCHOR_STATUS = {
  pending: "PENDING",
  anchored: "ANCHORED",
  failed: "FAILED",
} as const;

const BLOCKCHAIN_OPERATION = {
  anchor: "ISSUANCE",
  revoke: "REVOCATION",
} as const;

export async function processCredentialAnchor(
  job: Job<CredentialAnchorJobPayload>,
) {
  const credential = await prisma.credential.findUnique({
    where: {
      id: job.data.credentialId,
    },
    include: {
      issuer: true,
    },
  });

  if (!credential) {
    throw new Error(`Credential ${job.data.credentialId} not found.`);
  }

  const attemptNumber = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts ?? 1;

  try {
    if (job.data.operation === BLOCKCHAIN_OPERATION.anchor) {
      const result = await anchorCredentialOnChain(credential);
      await prisma.$transaction(async (tx) => {
        await tx.credential.update({
          where: { id: credential.id },
          data: {
            txHash: result.txHash ?? credential.txHash,
            chainId: result.chainId,
            anchoredAt: result.anchoredAt ?? credential.anchoredAt ?? new Date(),
            blockNumber: result.blockNumber ?? credential.blockNumber,
            anchorStatus: ANCHOR_STATUS.anchored,
            chainStatus: "ANCHORED",
            chainSyncedAt: new Date(),
            anchorVersion: "V2",
            issuerWallet: credential.issuer.wallet,
            chainVerificationMetadata: {
              lastOperation: BLOCKCHAIN_OPERATION.anchor,
              alreadyProcessed: result.alreadyProcessed,
            },
          },
        });

        await persistLifecycleLog(tx, credential.id, {
          operation: BLOCKCHAIN_OPERATION.anchor,
          status: ANCHOR_STATUS.anchored,
          txHash: result.txHash ?? credential.txHash,
          chainId: result.chainId,
          blockNumber: result.blockNumber ?? credential.blockNumber,
          attempts: attemptNumber,
        });
      });

      return {
        status: ANCHOR_STATUS.anchored,
        credentialId: credential.id,
        txHash: result.txHash,
      };
    }

    const result = await revokeCredentialOnChain(credential);
    await prisma.$transaction(async (tx) => {
      await tx.credential.update({
        where: { id: credential.id },
        data: {
          revocationTxHash: result.txHash ?? credential.revocationTxHash,
          chainStatus: "REVOKED",
          chainSyncedAt: new Date(),
          chainVerificationMetadata: {
            lastOperation: BLOCKCHAIN_OPERATION.revoke,
            alreadyProcessed: result.alreadyProcessed,
          },
        },
      });

      await persistLifecycleLog(tx, credential.id, {
        operation: BLOCKCHAIN_OPERATION.revoke,
        status: "REVOKED",
        txHash: result.txHash,
        chainId: result.chainId,
        blockNumber: result.blockNumber,
        attempts: attemptNumber,
      });
    });

    return {
      status: "REVOKED",
      credentialId: credential.id,
      txHash: result.txHash,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown blockchain worker failure.";
    const finalAttempt = attemptNumber >= maxAttempts;

    await prisma.$transaction(async (tx) => {
      if (job.data.operation === BLOCKCHAIN_OPERATION.anchor && finalAttempt) {
        await tx.credential.update({
          where: { id: credential.id },
          data: {
            anchorStatus: ANCHOR_STATUS.failed,
            chainStatus: ANCHOR_STATUS.failed,
          },
        });
      }

      await persistLifecycleLog(tx, credential.id, {
        operation: job.data.operation,
        status: finalAttempt ? ANCHOR_STATUS.failed : "RETRYING",
        attempts: attemptNumber,
        errorMessage: message,
      });
    });
    throw error;
  }
}

async function persistLifecycleLog(
  tx: Prisma.TransactionClient,
  credentialId: string,
  input: {
    operation: string;
    status: string;
    txHash?: string | null;
    chainId?: number | null;
    blockNumber?: number | null;
    attempts?: number;
    errorMessage?: string | null;
  },
) {
  const data = {
    operation: input.operation,
    status: input.status,
    txHash: input.txHash ?? null,
    chainId: input.chainId ?? null,
    blockNumber: input.blockNumber ?? null,
    attempts: input.attempts ?? 0,
    errorMessage: input.errorMessage ?? null,
  };

  const updated = await tx.blockchainAnchorLog.updateMany({
    where: { credentialId },
    data,
  });

  if (updated.count > 0) {
    return;
  }

  try {
    await tx.blockchainAnchorLog.create({
      data: {
        credentialId,
        ...data,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      await tx.blockchainAnchorLog.updateMany({
        where: { credentialId },
        data,
      });
      return;
    }

    throw error;
  }
}
