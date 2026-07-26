import type { Job } from "bullmq";
import { Prisma } from "@prisma/client";
import {
  BLOCKCHAIN_OPERATION,
  type CredentialAnchorJobPayload,
} from "@certiva/types";

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

function safeLog(
  level: "info" | "warn" | "error",
  message: string,
  meta: Record<string, unknown> = {},
) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    context: "CredentialAnchorWorker",
    message,
    ...meta,
  });
  if (level === "error") {
    process.stderr.write(entry + "\n");
  } else {
    process.stdout.write(entry + "\n");
  }
}

export async function processCredentialAnchor(
  job: Job<CredentialAnchorJobPayload>,
) {
  const { credentialId, operation } = job.data;

  safeLog("info", "Job started", {
    jobId: job.id,
    queue: job.queueName,
    credentialId,
    operation,
    attempt: job.attemptsMade + 1,
  });

  const credential = await prisma.credential.findUnique({
    where: {
      id: credentialId,
    },
    include: {
      issuer: true,
    },
  });

  if (!credential) {
    safeLog("error", "Credential not found", { jobId: job.id, credentialId });
    throw new Error(`Credential ${credentialId} not found.`);
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

      safeLog("info", "Job completed", {
        jobId: job.id,
        queue: job.queueName,
        credentialId: credential.id,
        operation: BLOCKCHAIN_OPERATION.anchor,
        status: ANCHOR_STATUS.anchored,
        attempt: attemptNumber,
      });

      return {
        status: ANCHOR_STATUS.anchored,
        credentialId: credential.id,
        txHash: result.txHash,
      };
    }

    // Everything that is not an anchor used to fall through to revocation. With
    // the operation type corrected there are four possible values, and revoking
    // a credential on chain because it arrived as BATCH_ISSUANCE is not
    // something a later retry can undo. Neither of the other two is enqueued
    // onto this queue today; if one ever is, it fails loudly here.
    if (job.data.operation !== BLOCKCHAIN_OPERATION.revoke) {
      throw new Error(
        `Unsupported operation ${job.data.operation} on the credential anchor queue.`,
      );
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

    safeLog("info", "Job completed", {
      jobId: job.id,
      queue: job.queueName,
      credentialId: credential.id,
      operation: BLOCKCHAIN_OPERATION.revoke,
      status: "REVOKED",
      attempt: attemptNumber,
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

    safeLog("error", "Job failed", {
      jobId: job.id,
      queue: job.queueName,
      credentialId: credential.id,
      operation: job.data.operation,
      attempt: attemptNumber,
      finalAttempt,
      errorMessage: message,
    });

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

  // Append-only: one immutable row per lifecycle event (2.1).
  await tx.blockchainAnchorLog.create({
    data: {
      credentialId,
      ...data,
    },
  });
}
