import { randomBytes } from 'node:crypto';

import { hmacSha256 } from '../../common/utils/hash.util';

export function generateDocumentProofId() {
  return `prf_${randomBytes(9).toString('hex')}`;
}

export function generateDocumentVerificationId() {
  return `dpf_${randomBytes(9).toString('hex')}`;
}

export function generateDocumentVerificationCode() {
  return `DP-${randomBytes(6).toString('hex').toUpperCase()}`;
}

export function buildDocumentSignedToken(input: {
  proofId: string;
  verificationId: string;
  verificationCode: string;
  issuerId: string;
  createdAt: Date;
  secret: string;
}) {
  return hmacSha256(
    [
      `proofId:${input.proofId}`,
      `verificationId:${input.verificationId}`,
      `verificationCode:${input.verificationCode}`,
      `issuerId:${input.issuerId}`,
      `createdAt:${input.createdAt.toISOString()}`,
    ].join('\n'),
    input.secret,
  );
}
