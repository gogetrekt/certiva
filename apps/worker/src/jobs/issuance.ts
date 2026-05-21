import type { Job } from "bullmq";
import type { IssuanceJobPayload } from "@certiva/types";

export async function processIssuance(job: Job<IssuanceJobPayload>) {
  const { credentialId, issuerId } = job.data;
  return {
    status: "queued",
    credentialId,
    issuerId,
  };
}
