import { publicKeyMultibase } from './multibase.util';
import { buildIssuerDid, normalizeIssuerDomain } from './vc-claims.util';

/**
 * `did:web` document for the issuing institution. Resolution is one HTTPS GET
 * (did:web:host -> https://host/.well-known/did.json), so no ledger, no vendor,
 * nothing to keep funded — the same posture as the rest of Certiva.
 */

export const DID_CONTEXT_V1 = 'https://www.w3.org/ns/did/v1';
export const MULTIKEY_CONTEXT = 'https://w3id.org/security/multikey/v1';

export interface DidDocumentKey {
  keyId: string;
  /** SPKI DER base64, as stored on IssuerSigningKey.publicKey. */
  publicKey: string;
  revokedAt: Date | null;
}

export interface DidDocumentInput {
  /** Issuer.domain — the Certiva-operated verification subdomain. */
  issuerDomain: string;
  institutionName: string;
  keys: DidDocumentKey[];
}

export function buildDidDocument(
  input: DidDocumentInput,
): Record<string, unknown> {
  const did = buildIssuerDid(input.issuerDomain);
  const domain = normalizeIssuerDomain(input.issuerDomain);

  // Append-only: retired keys stay in BOTH verificationMethod and
  // assertionMethod. did:web has no version history, so dropping a retired key
  // would break every credential it ever signed — credentials Certiva still
  // considers valid (keys are revoked, never deleted). The cost, stated openly:
  // a *leaked* key cannot be disabled through this document. Authoritative key
  // status lives at publicKeysUrl (revokedAt) and in the /proof bundle.
  const verificationMethod = input.keys.map((key) => ({
    id: `${did}#${key.keyId}`,
    type: 'Multikey',
    controller: did,
    publicKeyMultibase: publicKeyMultibase(key.publicKey),
  }));

  return {
    '@context': [DID_CONTEXT_V1, MULTIKEY_CONTEXT],
    id: did,
    verificationMethod,
    assertionMethod: verificationMethod.map((method) => method.id),
    service: [
      {
        id: `${did}#registry`,
        type: 'CredentialRegistry',
        serviceEndpoint: {
          institutionName: input.institutionName,
          origin: `https://${domain}`,
          // Authoritative key status, including revokedAt. This document is
          // append-only, so revocation is NOT readable from it.
          publicKeys: `https://${domain}/api/institution/public-keys`,
          // The framing is stated inline rather than as a link: this DID is
          // bound to the institution's dedicated verification subdomain, not to
          // its main website. A link would be one more URL that can rot.
          description:
            `Official credential verification authority for ${input.institutionName}. ` +
            'This domain is the institution\'s dedicated verification subdomain; ' +
            'DNS delegation of it is controlled by the institution.',
        },
      },
    ],
  };
}
