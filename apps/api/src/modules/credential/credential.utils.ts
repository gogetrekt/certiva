import { randomBytes } from "node:crypto";

import { hashString, hmacSha256 } from "../../common/utils/hash.util";

function normalizeValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function generateCredentialId() {
  return `crd_${randomBytes(9).toString("hex")}`;
}

export function generateVerificationId() {
  return `vrf_${randomBytes(9).toString("hex")}`;
}

export function generateVerificationCode() {
  return `CV-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export function buildSignedVerificationToken(input: {
  credentialId: string;
  verificationId: string;
  verificationCode: string;
  issuerId: string;
  issuedAt: Date;
  secret: string;
}) {
  return hmacSha256(
    [
      `credentialId:${input.credentialId}`,
      `verificationId:${input.verificationId}`,
      `verificationCode:${input.verificationCode}`,
      `issuerId:${input.issuerId}`,
      `issuedAt:${input.issuedAt.toISOString()}`,
    ].join("\n"),
    input.secret,
  );
}

export function buildRegistryProofHash(input: {
  credentialId: string;
  verificationId: string;
  verificationCode: string;
  issuerId: string;
  issuedAt: Date;
  signedVerificationToken: string;
}) {
  return hashString(
    [
      `credentialId:${input.credentialId}`,
      `verificationId:${input.verificationId}`,
      `verificationCode:${input.verificationCode}`,
      `issuerId:${input.issuerId}`,
      `issuedAt:${input.issuedAt.toISOString()}`,
      `signedVerificationToken:${input.signedVerificationToken}`,
    ].join("\n"),
  );
}

export function buildCanonicalCredentialPayload(input: {
  credentialId: string;
  verificationId: string;
  issuerId: string;
  institution: string;
  studentName: string;
  studentId: string;
  degree: string;
  issuedAt: Date;
}) {
  return [
    `credentialId:${input.credentialId}`,
    `verificationId:${input.verificationId}`,
    `issuerId:${input.issuerId}`,
    `institution:${normalizeValue(input.institution)}`,
    `studentName:${normalizeValue(input.studentName)}`,
    `studentId:${normalizeValue(input.studentId)}`,
    `degree:${normalizeValue(input.degree)}`,
    `issuedAt:${input.issuedAt.toISOString()}`,
  ].join("\n");
}

export function buildCredentialHash(input: {
  credentialId: string;
  verificationId: string;
  issuerId: string;
  institution: string;
  studentName: string;
  studentId: string;
  degree: string;
  issuedAt: Date;
}) {
  return hashString(buildCanonicalCredentialPayload(input));
}
