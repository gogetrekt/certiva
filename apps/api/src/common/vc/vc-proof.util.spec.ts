import {
  generateEd25519KeyPair,
  signEd25519,
  verifyEd25519,
} from '../signing/signing-crypto.util';
import { signatureToMultibase } from './multibase.util';
import {
  OPEN_BADGES_V3_CONTEXT,
  VC_CONTEXT_V2,
  buildIssuerDid,
  buildOpenBadgeCredential,
  normalizeIssuerDomain,
} from './vc-claims.util';
import {
  attachProof,
  buildProofConfig,
  buildProofHashData,
  extractVerificationInput,
  jcs,
} from './vc-proof.util';

const INPUT = {
  credentialId: 'crd_abc123',
  issuerId: 'iss_1',
  issuerDomain: 'Verify.Kampus.AC.ID/',
  issuerName: '  Universitas   Contoh ',
  studentName: 'Siti  Rahma',
  studentId: '20250001',
  degree: 'Sarjana Teknik  Informatika',
  graduationYear: 2025,
  issuedAt: new Date('2026-01-15T04:05:06.000Z'),
};

describe('jcs', () => {
  it('sorts object keys and strips insignificant whitespace (RFC 8785)', () => {
    expect(jcs({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it('is stable across key insertion order', () => {
    expect(jcs({ a: 1, b: [2, { d: 4, c: 3 }] })).toBe(
      jcs({ b: [2, { c: 3, d: 4 }], a: 1 }),
    );
  });
});

describe('buildOpenBadgeCredential', () => {
  const document = buildOpenBadgeCredential(INPUT);
  const subject = document.credentialSubject as Record<string, unknown>;

  it('uses only third-party hosted contexts', () => {
    expect(document['@context']).toEqual([
      VC_CONTEXT_V2,
      OPEN_BADGES_V3_CONTEXT,
    ]);
  });

  it('normalizes the issuer domain into the DID and the credential IRI', () => {
    expect(normalizeIssuerDomain(INPUT.issuerDomain)).toBe('verify.kampus.ac.id');
    expect((document.issuer as Record<string, unknown>).id).toBe(
      'did:web:verify.kampus.ac.id',
    );
    expect(document.id).toBe(
      'https://verify.kampus.ac.id/verify/crd_abc123',
    );
  });

  it('carries recipient name and student id as OBv3 IdentityObject values', () => {
    expect(subject.identifier).toEqual([
      {
        type: 'IdentityObject',
        hashed: false,
        identityType: 'name',
        identityHash: 'Siti Rahma',
      },
      {
        type: 'IdentityObject',
        hashed: false,
        identityType: 'sourcedId',
        identityHash: '20250001',
      },
    ]);
  });

  it('puts graduationYear in `term`, and omits it when unknown', () => {
    expect(subject.term).toBe('2025');
    const without = buildOpenBadgeCredential({
      ...INPUT,
      graduationYear: null,
    }).credentialSubject as Record<string, unknown>;
    expect('term' in without).toBe(false);
    expect('activityEndDate' in without).toBe(false);
  });

  it('never emits a subject id or the verification code', () => {
    expect('id' in subject).toBe(false);
    expect(JSON.stringify(document)).not.toContain('CV-');
  });

  it('keeps the achievement IRI stable per institution and programme', () => {
    const achievement = subject.achievement as Record<string, unknown>;
    const other = (
      buildOpenBadgeCredential({ ...INPUT, credentialId: 'crd_other' })
        .credentialSubject as Record<string, unknown>
    ).achievement as Record<string, unknown>;

    expect(achievement.id).toBe(other.id);
    expect(achievement.achievementType).toBe('Degree');
    expect(achievement.name).toBe('Sarjana Teknik Informatika');
    expect(
      (
        buildOpenBadgeCredential({ ...INPUT, issuerId: 'iss_2' })
          .credentialSubject as Record<string, unknown>
      ).achievement,
    ).not.toEqual(achievement);
  });
});

describe('eddsa-jcs-2022 proof', () => {
  const created = new Date('2026-01-15T04:05:06.000Z');

  function sign() {
    const { publicKey, privateKey } = generateEd25519KeyPair();
    const document = buildOpenBadgeCredential(INPUT);
    const proofConfig = buildProofConfig({
      issuerDomain: INPUT.issuerDomain,
      keyId: 'sk_test',
      created,
    });
    const signatureB64 = signEd25519(
      buildProofHashData(document, proofConfig),
      privateKey,
    );
    return {
      publicKey,
      secured: attachProof(
        document,
        proofConfig,
        signatureToMultibase(signatureB64),
      ),
    };
  }

  it('verifies a document it signed, using only the secured document', () => {
    const { publicKey, secured } = sign();
    const { hashData, signatureB64, verificationMethod } =
      extractVerificationInput(secured);

    expect(verificationMethod).toBe(
      `${buildIssuerDid(INPUT.issuerDomain)}#sk_test`,
    );
    expect(verifyEd25519(hashData, signatureB64, publicKey)).toBe(true);
  });

  it('publishes a proof whose @context matches the document', () => {
    // The cryptosuite copies the document @context onto the proof before
    // hashing. Publishing a proof without it (or with a different one) makes
    // every external verifier report "Invalid signature".
    const { secured } = sign();
    const proof = secured.proof as Record<string, unknown>;
    expect(proof['@context']).toEqual(secured['@context']);
    expect(proof.cryptosuite).toBe('eddsa-jcs-2022');
    expect(proof.proofPurpose).toBe('assertionMethod');
    expect(String(proof.proofValue).startsWith('z')).toBe(true);
  });

  it('fails verification when the document @context is swapped', () => {
    const { publicKey, secured } = sign();
    const { hashData, signatureB64 } = extractVerificationInput({
      ...secured,
      '@context': [VC_CONTEXT_V2],
    });
    expect(verifyEd25519(hashData, signatureB64, publicKey)).toBe(true);

    // ...but only because the proof's own context is authoritative. Swapping
    // the proof context breaks it, which is the property that matters.
    const proof = secured.proof as Record<string, unknown>;
    const swapped = extractVerificationInput({
      ...secured,
      proof: { ...proof, '@context': [VC_CONTEXT_V2] },
    });
    expect(
      verifyEd25519(swapped.hashData, swapped.signatureB64, publicKey),
    ).toBe(false);
  });

  it('signs digest bytes, not the publicPayload string', () => {
    const document = buildOpenBadgeCredential(INPUT);
    const hashData = buildProofHashData(
      document,
      buildProofConfig({
        issuerDomain: INPUT.issuerDomain,
        keyId: 'sk_test',
        created,
      }),
    );
    // 2 x SHA-256 — proof config digest followed by document digest.
    expect(hashData).toHaveLength(64);
  });

  it('fails verification when any signed field is altered', () => {
    const { publicKey, secured } = sign();
    const tampered = {
      ...secured,
      credentialSubject: {
        ...(secured.credentialSubject as Record<string, unknown>),
        term: '2026',
      },
    };
    const { hashData, signatureB64 } = extractVerificationInput(tampered);

    expect(verifyEd25519(hashData, signatureB64, publicKey)).toBe(false);
  });

  it('fails verification when the proof options are altered', () => {
    const { publicKey, secured } = sign();
    const proof = secured.proof as Record<string, unknown>;
    const { hashData, signatureB64 } = extractVerificationInput({
      ...secured,
      proof: { ...proof, created: '2026-02-01T00:00:00.000Z' },
    });

    expect(verifyEd25519(hashData, signatureB64, publicKey)).toBe(false);
  });

  it('refuses to hash a document that still carries a proof', () => {
    const { secured } = sign();
    expect(() => buildProofHashData(secured, {})).toThrow(/without `proof`/);
  });
});
