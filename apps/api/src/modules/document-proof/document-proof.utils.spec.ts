import {
  buildDocumentSignedToken,
  generateDocumentProofId,
  generateDocumentVerificationCode,
  generateDocumentVerificationId,
} from './document-proof.utils';

/**
 * The signed token is what stops someone from minting their own document-proof
 * verification link: it is an HMAC over the proof's identity, keyed by a server
 * secret. So the properties worth testing are the ones an attacker would probe —
 * that the token moves when any covered field moves, and that it cannot be
 * produced without the right secret.
 */

const SECRET = 'server-side-secret-at-least-32-characters-long';

const BASE = {
  proofId: 'prf_0123456789abcdef01',
  verificationId: 'dpf_0123456789abcdef01',
  verificationCode: 'DP-ABCDEF0123',
  issuerId: 'inst_1',
  createdAt: new Date('2025-06-01T07:30:00.000Z'),
  secret: SECRET,
};

describe('buildDocumentSignedToken', () => {
  it('produces a stable 64-char hex digest', () => {
    const token = buildDocumentSignedToken(BASE);

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(buildDocumentSignedToken(BASE)).toBe(token);
  });

  it.each([
    ['proofId', { proofId: 'prf_ffffffffffffffffff' }],
    ['verificationId', { verificationId: 'dpf_ffffffffffffffffff' }],
    ['verificationCode', { verificationCode: 'DP-000000000000' }],
    ['issuerId', { issuerId: 'inst_2' }],
    ['createdAt', { createdAt: new Date('2025-06-01T07:30:00.001Z') }],
  ])('changes when %s changes', (_, patch) => {
    expect(buildDocumentSignedToken({ ...BASE, ...patch })).not.toBe(
      buildDocumentSignedToken(BASE),
    );
  });

  it('cannot be reproduced with a different secret', () => {
    // Without this, a leaked token format would be enough to forge a link.
    expect(
      buildDocumentSignedToken({ ...BASE, secret: `${SECRET}x` }),
    ).not.toBe(buildDocumentSignedToken(BASE));
  });

  it('does not leak the secret into the token', () => {
    expect(buildDocumentSignedToken(BASE)).not.toContain(SECRET);
  });

  it('is not confusable by shifting content across field boundaries', () => {
    // proofId "a" + verificationId "bc" must not hash the same as "ab" + "c".
    const left = buildDocumentSignedToken({
      ...BASE,
      proofId: 'a',
      verificationId: 'bc',
    });
    const right = buildDocumentSignedToken({
      ...BASE,
      proofId: 'ab',
      verificationId: 'c',
    });

    expect(left).not.toBe(right);
  });

  it('treats two Date objects for the same instant as the same token', () => {
    expect(
      buildDocumentSignedToken({
        ...BASE,
        createdAt: new Date(Date.parse('2025-06-01T09:30:00.000+02:00')),
      }),
    ).toBe(buildDocumentSignedToken(BASE));
  });
});

describe('document-proof id generators', () => {
  it.each([
    ['generateDocumentProofId', generateDocumentProofId, /^prf_[a-f0-9]{18}$/],
    [
      'generateDocumentVerificationId',
      generateDocumentVerificationId,
      /^dpf_[a-f0-9]{18}$/,
    ],
    [
      'generateDocumentVerificationCode',
      generateDocumentVerificationCode,
      /^DP-[A-F0-9]{12}$/,
    ],
  ])('%s matches its documented shape', (_, generate, pattern) => {
    expect(generate()).toMatch(pattern);
  });

  it('uses distinct prefixes, so an id cannot be used in the wrong slot', () => {
    expect(generateDocumentProofId().startsWith('prf_')).toBe(true);
    expect(generateDocumentVerificationId().startsWith('dpf_')).toBe(true);
  });

  it.each([
    ['proof ids', generateDocumentProofId],
    ['verification ids', generateDocumentVerificationId],
    ['verification codes', generateDocumentVerificationCode],
  ])('does not repeat %s across 500 draws', (_, generate) => {
    // Guessability is the risk: a verification code is a public lookup key, so a
    // generator that collided or ran off a counter would be enumerable.
    const seen = new Set(Array.from({ length: 500 }, () => generate()));

    expect(seen.size).toBe(500);
  });
});
