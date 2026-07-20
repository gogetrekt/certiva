export interface GeneratedSigningKey {
  /** Ed25519 public key, SPKI DER base64. Safe to store in the clear / publish. */
  publicKey: string;
  /**
   * Opaque private-key material to persist in IssuerSigningKey.privateKeyEncrypted.
   * Its meaning is provider-specific: an encrypted blob for the at-rest provider,
   * a key reference id for a future KMS provider. Callers never interpret it.
   */
  privateKeyStored: string;
}

/**
 * Pluggable seam for how issuer private keys are generated, stored, and used to
 * sign — mirrors the StorageProvider pattern (local vs r2). The at-rest
 * implementation ships now; a KMS/HSM implementation can replace it later
 * without touching any caller, since the raw private key never crosses this
 * boundary (signing happens inside the provider).
 */
export interface SigningKeyProvider {
  readonly algorithm: string;

  /** Create a fresh keypair. Public key returned plain; private returned as opaque stored material. */
  generateKeyPair(): Promise<GeneratedSigningKey>;

  /** Sign a canonical payload string using previously stored private material. Returns base64 signature. */
  sign(payload: string, privateKeyStored: string): Promise<string>;
}

export const SIGNING_KEY_PROVIDER = Symbol('SIGNING_KEY_PROVIDER');
