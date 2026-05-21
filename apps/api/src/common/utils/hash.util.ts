import { createHash, createHmac } from "node:crypto";

function normalizeHash(hash: string) {
  return hash.trim().toLowerCase();
}

export function hashBuffer(buffer: Uint8Array | Buffer) {
  return normalizeHash(createHash("sha256").update(buffer).digest("hex"));
}

export function hashString(data: string) {
  return normalizeHash(createHash("sha256").update(data, "utf8").digest("hex"));
}

export function hmacSha256(data: string, secret: string) {
  return normalizeHash(createHmac("sha256", secret).update(data, "utf8").digest("hex"));
}
