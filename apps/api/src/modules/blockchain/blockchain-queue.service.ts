import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Queue } from "bullmq";
import IORedis from "ioredis";

import { AppConfigService } from "../../config/app-config.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ANCHOR_STATUS,
  BLOCKCHAIN_JOB_ATTEMPTS,
  BLOCKCHAIN_JOB_NAMES,
  BLOCKCHAIN_OPERATION,
  BLOCKCHAIN_QUEUE_BACKOFF_MS,
  BLOCKCHAIN_QUEUE_NAME,
} from "./blockchain.constants";

@Injectable()
export class BlockchainQueueService implements OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly queue: Queue;

  constructor(
    private readonly configService: AppConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.connection = new IORedis(this.configService.redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    this.queue = new Queue(BLOCKCHAIN_QUEUE_NAME, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: BLOCKCHAIN_JOB_ATTEMPTS,
        backoff: {
          type: "exponential",
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

  async markQueueFailure(credentialId: string, operation: string, message: string) {
    await this.prisma.$transaction(async (tx) => {
      if (operation === BLOCKCHAIN_OPERATION.anchor) {
        await tx.credential.update({
          where: { id: credentialId },
          data: {
            anchorStatus: ANCHOR_STATUS.failed,
            chainStatus: ANCHOR_STATUS.failed,
          },
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
}
