import { generateEd25519KeyPair } from '../signing/signing-crypto.util';
import { buildDidDocument } from './did-document.util';

const ACTIVE = generateEd25519KeyPair();
const RETIRED = generateEd25519KeyPair();

const document = buildDidDocument({
  issuerDomain: 'https://Verify.Kampus.AC.ID/',
  institutionName: 'Universitas Contoh',
  keys: [
    { keyId: 'sk_new', publicKey: ACTIVE.publicKey, revokedAt: null },
    {
      keyId: 'sk_old',
      publicKey: RETIRED.publicKey,
      revokedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ],
});

describe('buildDidDocument', () => {
  it('derives the DID from the normalized verification domain', () => {
    expect(document.id).toBe('did:web:verify.kampus.ac.id');
  });

  it('keeps retired keys in assertionMethod (append-only)', () => {
    // Dropping a retired key would break every credential it signed, which
    // Certiva still treats as valid. Revocation status is not readable here.
    expect(document.assertionMethod).toEqual([
      'did:web:verify.kampus.ac.id#sk_new',
      'did:web:verify.kampus.ac.id#sk_old',
    ]);
  });

  it('publishes each key as a Multikey controlled by the DID', () => {
    const methods = document.verificationMethod as Record<string, unknown>[];
    expect(methods).toHaveLength(2);
    for (const method of methods) {
      expect(method.type).toBe('Multikey');
      expect(method.controller).toBe('did:web:verify.kampus.ac.id');
      expect(String(method.publicKeyMultibase).startsWith('z6Mk')).toBe(true);
    }
  });

  it('never leaks revocation timestamps as if they were authoritative here', () => {
    expect(JSON.stringify(document)).not.toContain('2026-01-01');
  });

  it('points verifiers at the authoritative key-status endpoint', () => {
    const [service] = document.service as Record<string, unknown>[];
    const endpoint = service.serviceEndpoint as Record<string, unknown>;
    expect(endpoint.publicKeys).toBe(
      'https://verify.kampus.ac.id/api/institution/public-keys',
    );
    expect(endpoint.institutionName).toBe('Universitas Contoh');
  });
});
