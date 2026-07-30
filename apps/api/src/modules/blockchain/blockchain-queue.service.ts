import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ANCHOR_STATUS,
  CHAIN_STATUS,
  BLOCKCHAIN_JOB_ATTEMPTS,
  BLOCKCHAIN_JOB_NAMES,
  BLOCKCHAIN_OPERATION,
  BLOCKCHAIN_QUEUE_BACKOFF_MS,
  BLOCKCHAIN_QUEUE_NAME,
} from './blockchain.constants';

/** Matches the rate limiter's client: a producer waits briefly, then gives up. */
const REDIS_CONNECT_TIMEOUT_MS = 500;

@Injectable()
export class BlockchainQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(BlockchainQueueService.name);
  private readonly connection: IORedis;
  private readonly queue: Queue;

  constructor(
    private readonly configService: AppConfigService,
    private readonly prisma: PrismaService,
  ) {
    // This is the *producer* side. BullMQ requires maxRetriesPerRequest: null
    // on a Worker connection, but a producer that cannot reach Redis has to say
    // so: with the default enableOfflineQueue: true, queue.add() parks the
    // command in an in-memory offline queue and never settles, so the request
    // hangs instead of failing and every catch { markQueueFailure(...) } around
    // an enqueue becomes unreachable in exactly the failure mode most likely to
    // occur. Fail fast here, the same way the rate limiter and health check
    // clients already do.
    this.connection = new IORedis(this.configService.redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      lazyConnect: true,
    });

    this.queue = new Queue(BLOCKCHAIN_QUEUE_NAME, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: BLOCKCHAIN_JOB_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: BLOCKCHAIN_QUEUE_BACKOFF_MS,
        },
        removeOnComplete: 200,
        removeOnFail: 200,
      },
    });
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.connection.quit();
  }

  async enqueueAnchor(credentialId: string) {
    if (!this.configService.blockchainEnabled) {
      this.logger.log(
        `Blockchain disabled; skipping anchor enqueue for ${credentialId}`,
      );
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.credential.update({
        where: { id: credentialId },
        data: {
          anchorStatus: ANCHOR_STATUS.pending,
          chainStatus: ANCHOR_STATUS.pending,
        },
      });

      await this.persistLifecycleLog(tx, credentialId, {
        operation: BLOCKCHAIN_OPERATION.anchor,
        status: ANCHOR_STATUS.pending,
      });
    });

    await this.queue.add(
      BLOCKCHAIN_JOB_NAMES.anchor,
      {
        credentialId,
        operation: BLOCKCHAIN_OPERATION.anchor,
      },
      {
        jobId: `${BLOCKCHAIN_JOB_NAMES.anchor}-${credentialId}`,
      },
    );
  }

  async enqueueRevoke(credentialId: string) {
    if (!this.configService.blockchainEnabled) {
      this.logger.log(
        `Blockchain disabled; skipping revoke enqueue for ${credentialId}`,
      );
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await this.persistLifecycleLog(tx, credentialId, {
        operation: BLOCKCHAIN_OPERATION.revoke,
        status: ANCHOR_STATUS.pending,
      });
    });

    await this.queue.add(
      BLOCKCHAIN_JOB_NAMES.revoke,
      {
        credentialId,
        operation: BLOCKCHAIN_OPERATION.revoke,
      },
      {
        jobId: `${BLOCKCHAIN_JOB_NAMES.revoke}-${credentialId}`,
      },
    );
  }

  async markQueueFailure(
    credentialId: string,
    operation: string,
    message: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      // Same shape as the worker's final-attempt handler, one step earlier in
      // the pipeline: the job never made it onto the queue, so no chain write
      // was ever attempted. An unrecognised operation gets the lifecycle log
      // below and nothing else — that is a programming error, not a credential
      // whose status is known to be wrong.
      const failedStatus =
        operation === BLOCKCHAIN_OPERATION.anchor
          ? {
              anchorStatus: ANCHOR_STATUS.failed,
              chainStatus: CHAIN_STATUS.failed,
            }
          : operation === BLOCKCHAIN_OPERATION.revoke
            ? // anchorStatus is left alone: the credential really is anchored.
              // REVOKE_ENQUEUE_FAILED rather than REVOKE_FAILED because the job
              // never reached the worker, so the on-chain revocation was not
              // attempted and failed — it was never tried at all.
              { chainStatus: CHAIN_STATUS.revokeEnqueueFailed }
            : null;

      if (failedStatus) {
        await tx.credential.update({
          where: { id: credentialId },
          data: failedStatus,
        });
      }

      await this.persistLifecycleLog(tx, credentialId, {
        operation,
        status: ANCHOR_STATUS.failed,
        errorMessage: message,
      });
    });
  }

  private async persistLifecycleLog(
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
}
