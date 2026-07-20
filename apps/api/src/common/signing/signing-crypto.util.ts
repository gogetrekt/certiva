import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  scryptSync,
  sign as edSign,
  verify as edVerify,
} from 'node:crypto';

/**
 * Ed25519 signing primitives + at-rest secret encryption, built entirely on
 * Node's stdlib `crypto` — no external dependency, no vendor in the critical
 * path (matches Certiva's self-hosted posture and the existing hash.util style).
 *
 * Key encodings (all base64, interoperable with any Ed25519 implementation):
 *   - publicKey:  SPKI  DER
 *   - privateKey: PKCS8 DER  (always stored encrypted, never raw)
 *   - signature:  raw 64-byte Ed25519 signature
 */

export interface Ed25519KeyPair {
  /** SPKI DER, base64. Safe to publish. */
  publicKey: string;
  /** PKCS8 DER, base64. Caller MUST encrypt before persisting. */
  privateKey: string;
}

export function generateEd25519KeyPair(): Ed25519KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKey: publicKey
      .export({ type: 'spki', format: 'der' })
      .toString('base64'),
    privateKey: privateKey
      .export({ type: 'pkcs8', format: 'der' })
      .toString('base64'),
  };
}

/** Sign a UTF-8 payload string; returns a base64 Ed25519 signature. */
export function signEd25519(
  payload: string,
  privateKeyPkcs8B64: string,
): string {
  const key = createPrivateKey({
    key: Buffer.from(privateKeyPkcs8B64, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });
  return edSign(null, Buffer.from(payload, 'utf8'), key).toString('base64');
}

/**
 * Verify a signature against a payload + public key. Pure function, no DB — this
 * is what makes third-party verification possible and doubles as a reference
 * implementation for external verifiers. Never throws; malformed input -> false.
 */
export function verifyEd25519(
  payload: string,
  signatureB64: string,
  publicKeySpkiB64: string,
): boolean {
  try {
    const key = createPublicKey({
      key: Buffer.from(publicKeySpkiB64, 'base64'),
      format: 'der',
      type: 'spki',
    });
    return edVerify(
      null,
      Buffer.from(payload, 'utf8'),
      key,
      Buffer.from(signatureB64, 'base64'),
    );
  } catch {
    return false;
  }
}

// --- At-rest secret encryption (AES-256-GCM) ----------------------------------

const ENC_VERSION = 'v1';
const SALT_LEN = 16;
const IV_LEN = 12;

function deriveKey(masterSecret: string, salt: Buffer): Buffer {
  // scrypt is intentionally slow; signing is not hot-path, so this is fine.
  // ponytail: fixed scrypt params, tune N upward if key-derivation cost matters.
  return scryptSync(masterSecret, salt, 32);
}

/**
 * Encrypt a plaintext secret (e.g. a PKCS8 private key blob) with a master
 * secret. Output: `v1.<salt>.<iv>.<tag>.<ciphertext>`, each part base64.
 * A fresh random salt + IV per call means identical inputs never collide.
 */
export function encryptSecret(plaintext: string, masterSecret: string): string {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(
    'aes-256-gcm',
    deriveKey(masterSecret, salt),
    iv,
  );
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    ENC_VERSION,
    salt.toString('base64'),
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

/** Reverse of encryptSecret. Throws if the blob is malformed or tampered. */
export function decryptSecret(blob: string, masterSecret: string): string {
  const parts = blob.split('.');
  if (parts.length !== 5 || parts[0] !== ENC_VERSION) {
    throw new Error('Invalid encrypted secret format');
  }
  const [, saltB64, ivB64, tagB64, ctB64] = parts;
  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    deriveKey(masterSecret, salt),
    iv,
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
