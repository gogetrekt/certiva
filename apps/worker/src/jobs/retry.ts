import type { Job } from "bullmq";
import type { RetryJobPayload } from "@certiva/types";

export async function processRetry(job: Job<RetryJobPayload>) {
  const { jobId, attempts } = job.data;
  return {
    status: "scheduled",
    jobId,
    attempts,
  };
}
