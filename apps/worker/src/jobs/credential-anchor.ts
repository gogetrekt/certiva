import type { Job } from "bullmq";
import { Prisma } from "@prisma/client";
import {
  ANCHOR_STATUS,
  BLOCKCHAIN_OPERATION,
  CHAIN_STATUS,
  type CredentialAnchorJobPayload,
} from "@certiva/types";

import { prisma } from "../lib/prisma";
import {
  anchorCredentialOnChain,
  revokeCredentialOnChain,
} from "../lib/blockchain";

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
      // Only the two operations this queue actually runs get a status written.
      // An unrecognised operation is a programming error, not a chain failure —
      // it gets the lifecycle log below and nothing else, rather than being
      // mislabelled as a failed revoke.
      const finalStatus = finalAttempt
        ? job.data.operation === BLOCKCHAIN_OPERATION.anchor
          ? {
              anchorStatus: ANCHOR_STATUS.failed,
              chainStatus: CHAIN_STATUS.failed,
            }
          : job.data.operation === BLOCKCHAIN_OPERATION.revoke
            ? // A revoke keeps its anchorStatus: the anchoring itself succeeded
              // and rewriting it to FAILED would erase that. Only chainStatus
              // moves, to the one value that says "on-chain state disagrees
              // with the database and a human has to settle it". REVOKE_FAILED,
              // not REVOKE_ENQUEUE_FAILED: the job did reach here and every
              // on-chain attempt was made and failed.
              { chainStatus: CHAIN_STATUS.revokeFailed }
            : null
        : null;

      if (finalStatus) {
        await tx.credential.update({
          where: { id: credential.id },
          data: finalStatus,
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
