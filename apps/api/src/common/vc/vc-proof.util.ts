import { createHash } from 'node:crypto';

import canonicalize from 'canonicalize';

import { multibaseToSignatureBase64 } from './multibase.util';
import { buildVerificationMethodId } from './vc-claims.util';

/**
 * `eddsa-jcs-2022` DataIntegrityProof primitives.
 *
 * Chosen over `eddsa-rdfc-2022` because RDF canonicalization needs `jsonld` +
 * `rdf-canonize`, both of which fetch remote @context documents at sign and
 * verify time — a third-party outage would then break verification. JCS
 * (RFC 8785) only reorders plain JSON, so signing and verifying stay offline.
 *
 * NOTE the bytes signed here are NOT Credential.publicPayload. Data Integrity
 * signs SHA-256(canonical proof config) || SHA-256(canonical document), so a VC
 * needs its own signature; the existing Ed25519 signature cannot be reused.
 * Both cover the same fields from the same source of truth.
 */

export const EDDSA_JCS_CRYPTOSUITE = 'eddsa-jcs-2022';

export interface ProofConfigInput {
  issuerDomain: string;
  keyId: string;
  created: Date;
}

/** RFC 8785 JSON Canonicalization Scheme. */
export function jcs(value: unknown): string {
  const canonical = canonicalize(value);
  if (canonical === undefined) {
    throw new Error('Value is not JCS-serializable.');
  }
  return canonical;
}

/**
 * The proof options, without `@context`. The cryptosuite copies the unsecured
 * document's own `@context` onto the proof before hashing, and a verifier
 * reconstructs it the same way, so this must not carry a context of its own —
 * a different one would produce different canonical bytes and fail to verify.
 */
export function buildProofConfig(
  input: ProofConfigInput,
): Record<string, unknown> {
  return {
    type: 'DataIntegrityProof',
    cryptosuite: EDDSA_JCS_CRYPTOSUITE,
    created: input.created.toISOString(),
    verificationMethod: buildVerificationMethodId(
      input.issuerDomain,
      input.keyId,
    ),
    proofPurpose: 'assertionMethod',
  };
}

/**
 * Bytes to sign: SHA-256 of the canonical proof config followed by SHA-256 of
 * the canonical document (proof config first — the order is normative).
 * `document` must not contain a `proof` member.
 */
export function buildProofHashData(
  document: Record<string, unknown>,
  proofConfig: Record<string, unknown>,
): Buffer {
  if ('proof' in document) {
    throw new Error('Hash data must be built over a document without `proof`.');
  }
  const { proofValue: _proofValue, ...options } = proofConfig;
  return Buffer.concat([
    createHash('sha256')
      .update(jcs({ '@context': document['@context'], ...options }), 'utf8')
      .digest(),
    createHash('sha256').update(jcs(document), 'utf8').digest(),
  ]);
}

/**
 * Attach a stored proofValue (base58btc multibase) to an unsecured document.
 * The proof keeps an `@context` equal to the document's: the verifier hashes
 * the proof exactly as published, so dropping it would break verification.
 */
export function attachProof(
  document: Record<string, unknown>,
  proofConfig: Record<string, unknown>,
  proofValue: string,
): Record<string, unknown> {
  return {
    ...document,
    proof: {
      '@context': document['@context'],
      ...proofConfig,
      proofValue,
    },
  };
}

/**
 * Rebuild the exact bytes a verifier must check, from a secured document. Used
 * by the round-trip test and usable as a reference implementation for anyone
 * verifying a Certiva VC without a full VC library.
 */
export function extractVerificationInput(secured: Record<string, unknown>): {
  hashData: Buffer;
  signatureB64: string;
  verificationMethod: string;
} {
  const { proof, ...document } = secured;
  if (!proof || typeof proof !== 'object') {
    throw new Error('Document carries no proof.');
  }
  const { proofValue, ...proofRest } = proof as Record<string, unknown>;
  if (typeof proofValue !== 'string') {
    throw new Error('Proof carries no proofValue.');
  }
  // The proof's @context wins, mirroring the cryptosuite: it is what the signer
  // committed to, and a document whose context was swapped afterwards must fail.
  const unsecured = { ...document, '@context': proofRest['@context'] };
  return {
    hashData: buildProofHashData(unsecured, proofRest),
    signatureB64: multibaseToSignatureBase64(proofValue),
    verificationMethod: String(proofRest.verificationMethod ?? ''),
  };
}
