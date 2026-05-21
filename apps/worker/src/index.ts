import "dotenv/config";
import { Queue, QueueEvents, Worker } from "bullmq";
import IORedis from "ioredis";

import { processIssuance } from "./jobs/issuance";
import { processCredentialAnchor } from "./jobs/credential-anchor";
import { processRetry } from "./jobs/retry";
import { prisma } from "./lib/prisma";
import { QUEUE_NAMES } from "./queues";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error("REDIS_URL is required for worker startup. Set it in the worker service environment.");
  process.exit(1);
}

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

const issuanceQueue = new Queue(QUEUE_NAMES.issuance, { connection });
const retryQueue = new Queue(QUEUE_NAMES.retry, { connection });
const credentialAnchorQueue = new Queue(QUEUE_NAMES.credentialAnchor, { connection });

const issuanceWorker = new Worker(QUEUE_NAMES.issuance, processIssuance, {
  connection,
  concurrency: 5,
});
const retryWorker = new Worker(QUEUE_NAMES.retry, processRetry, {
  connection,
  concurrency: 5,
});
const credentialAnchorWorker = new Worker(
  QUEUE_NAMES.credentialAnchor,
  processCredentialAnchor,
  {
  connection,
  concurrency: 3,
  },
);

const issuanceEvents = new QueueEvents(QUEUE_NAMES.issuance, { connection });
const retryEvents = new QueueEvents(QUEUE_NAMES.retry, { connection });
const credentialAnchorEvents = new QueueEvents(QUEUE_NAMES.credentialAnchor, { connection });

const shutdown = async () => {
  await Promise.all([
    issuanceWorker.close(),
    retryWorker.close(),
    credentialAnchorWorker.close(),
    issuanceEvents.close(),
    retryEvents.close(),
    credentialAnchorEvents.close(),
    issuanceQueue.close(),
    retryQueue.close(),
    credentialAnchorQueue.close(),
    prisma.$disconnect(),
  ]);

  await connection.quit();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("Worker online. Listening for queue jobs.");
