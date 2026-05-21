export const QUEUE_NAMES = {
  issuance: "issuance",
  retry: "retry",
  credentialAnchor: "credential-anchor",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
