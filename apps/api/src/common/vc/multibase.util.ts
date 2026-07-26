import { createPublicKey } from 'node:crypto';

/**
 * Multibase / multicodec encoding for W3C Data Integrity proofs and DID
 * documents, built entirely on Node's stdlib `crypto` — same zero-dependency
 * posture as signing-crypto.util.ts.
 *
 * Two things need it:
 *   - DID Document `verificationMethod.publicKeyMultibase` (Multikey type):
 *     "z" + base58btc(0xed01 || 32-byte raw Ed25519 public key)
 *   - DataIntegrityProof `proofValue`:
 *     "z" + base58btc(64-byte raw Ed25519 signature)
 *
 * The DB stores keys as SPKI DER and signatures as base64, so this module also
 * carries the conversions in and out of those encodings.
 */

const BASE58BTC_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** multicodec prefix for an Ed25519 public key (varint 0xed01). */
const ED25519_PUB_MULTICODEC = Uint8Array.from([0xed, 0x01]);

export function base58btcEncode(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;
  const leading = BASE58BTC_ALPHABET[0].repeat(zeros);
  if (zeros === bytes.length) return leading;

  // Little-endian base-58 digits, built by repeated multiply-and-carry so we
  // never need BigInt or a bignum dependency.
  const digits: number[] = [];
  for (const byte of bytes.subarray(zeros)) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      carry += digits[i] * 256;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let out = leading;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    out += BASE58BTC_ALPHABET[digits[i]];
  }
  return out;
}

export function base58btcDecode(text: string): Uint8Array {
  let zeros = 0;
  while (zeros < text.length && text[zeros] === BASE58BTC_ALPHABET[0]) {
    zeros += 1;
  }

  const bytes: number[] = [];
  for (const char of text.slice(zeros)) {
    let carry = BASE58BTC_ALPHABET.indexOf(char);
    if (carry < 0) {
      throw new Error(`Not a base58btc string: unexpected character "${char}".`);
    }
    for (let i = 0; i < bytes.length; i += 1) {
      carry += bytes[i] * 58;
      bytes[i] = carry % 256;
      carry = Math.floor(carry / 256);
    }
    while (carry > 0) {
      bytes.push(carry % 256);
      carry = Math.floor(carry / 256);
    }
  }

  const out = new Uint8Array(zeros + bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    out[out.length - 1 - i] = bytes[i];
  }
  return out;
}

/**
 * Raw 32-byte Ed25519 public key out of the SPKI DER stored on
 * IssuerSigningKey.publicKey. Goes through the JWK export rather than slicing
 * the DER prefix by hand so a malformed or non-Ed25519 key is rejected by
 * node:crypto instead of silently producing 32 wrong bytes.
 */
export function rawEd25519PublicKey(publicKeySpkiB64: string): Uint8Array {
  const jwk = createPublicKey({
    key: Buffer.from(publicKeySpkiB64, 'base64'),
    format: 'der',
    type: 'spki',
  }).export({ format: 'jwk' });

  if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || !jwk.x) {
    throw new Error('Not an Ed25519 public key.');
  }
  return new Uint8Array(Buffer.from(jwk.x, 'base64url'));
}

/** Multikey form of a stored public key, for DID document verificationMethod. */
export function publicKeyMultibase(publicKeySpkiB64: string): string {
  const raw = rawEd25519PublicKey(publicKeySpkiB64);
  const prefixed = new Uint8Array(ED25519_PUB_MULTICODEC.length + raw.length);
  prefixed.set(ED25519_PUB_MULTICODEC);
  prefixed.set(raw, ED25519_PUB_MULTICODEC.length);
  return `z${base58btcEncode(prefixed)}`;
}

/** DataIntegrityProof `proofValue` from a base64 Ed25519 signature. */
export function signatureToMultibase(signatureB64: string): string {
  return `z${base58btcEncode(new Uint8Array(Buffer.from(signatureB64, 'base64')))}`;
}

/**
 * Inverse of signatureToMultibase — lets a verifier feed a `proofValue` back
 * into verifyEd25519(), which speaks base64.
 */
export function multibaseToSignatureBase64(proofValue: string): string {
  if (!proofValue.startsWith('z')) {
    throw new Error('proofValue is not base58btc multibase (expected "z" prefix).');
  }
  return Buffer.from(base58btcDecode(proofValue.slice(1))).toString('base64');
}
