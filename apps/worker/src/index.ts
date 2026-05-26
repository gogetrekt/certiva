import "dotenv/config";
import { Queue, QueueEvents, Worker } from "bullmq";
import IORedis from "ioredis";

import { processIssuance } from "./jobs/issuance";
import { processCredentialAnchor } from "./jobs/credential-anchor";
import { processRetry } from "./jobs/retry";
import { prisma } from "./lib/prisma";
import { QUEUE_NAMES } from "./queues";

function safeLog(
  level: "info" | "warn" | "error",
  message: string,
  meta: Record<string, unknown> = {},
) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    context: "Worker",
    message,
    ...meta,
  });
  if (level === "error") {
    process.stderr.write(entry + "\n");
  } else {
    process.stdout.write(entry + "\n");
  }
}

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  safeLog("error", "REDIS_URL is required for worker startup");
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

// Safe worker error listeners — log message only, never private keys or config
function attachErrorListener(worker: Worker, queueName: string) {
  worker.on("error", (error) => {
    safeLog("error", "Worker error", {
      queue: queueName,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  });

  worker.on("failed", (job, error) => {
    safeLog("error", "Job failed", {
      queue: queueName,
      jobId: job?.id,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  });
}

attachErrorListener(issuanceWorker, QUEUE_NAMES.issuance);
attachErrorListener(retryWorker, QUEUE_NAMES.retry);
attachErrorListener(credentialAnchorWorker, QUEUE_NAMES.credentialAnchor);

const issuanceEvents = new QueueEvents(QUEUE_NAMES.issuance, { connection });
const retryEvents = new QueueEvents(QUEUE_NAMES.retry, { connection });
const credentialAnchorEvents = new QueueEvents(QUEUE_NAMES.credentialAnchor, { connection });

const shutdown = async () => {
  safeLog("info", "Worker shutting down");
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

safeLog("info", "Worker online", {
  queues: [QUEUE_NAMES.issuance, QUEUE_NAMES.retry, QUEUE_NAMES.credentialAnchor],
});
