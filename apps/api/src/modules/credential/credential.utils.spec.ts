import {
  buildPublicSignaturePayload,
  normalizeValue,
  type PublicCredentialPayload,
} from './credential.utils';

/**
 * These tests pin the exact bytes that every Ed25519 credential signature in the
 * system is computed over. They are deliberately written as full literal strings
 * rather than jest snapshots: a snapshot can be regenerated with `-u` by someone
 * who does not realise that regenerating it invalidates every signature ever
 * issued. A hand-written expectation has to be edited on purpose.
 *
 * If a change here fails, the correct response is almost never "update the
 * expectation". Changing field order, adding or removing a field, or altering
 * normalisation silently breaks verification for every credential already signed
 * with the old shape, and credentials whose signing key has since been revoked
 * cannot be re-signed to recover.
 */

const BASE: PublicCredentialPayload = {
  credentialId: 'crd_0123456789abcdef01',
  verificationId: 'vrf_0123456789abcdef01',
  issuerDomain: 'univ.ac.id',
  issuerName: 'Universitas Contoh',
  studentName: 'Siti Rahmawati',
  studentId: '2021010101',
  degree: 'Sarjana Teknik Informatika',
  graduationYear: 2025,
  issuedAt: new Date('2025-06-01T07:30:00.000Z'),
  signingKeyId: 'key_01',
};

describe('buildPublicSignaturePayload', () => {
  it('emits the ten fields in a fixed order, newline separated', () => {
    expect(buildPublicSignaturePayload(BASE)).toBe(
      [
        'credentialId:crd_0123456789abcdef01',
        'verificationId:vrf_0123456789abcdef01',
        'issuerDomain:univ.ac.id',
        'issuerName:Universitas Contoh',
        'studentName:Siti Rahmawati',
        'studentId:2021010101',
        'degree:Sarjana Teknik Informatika',
        'graduationYear:2025',
        'issuedAt:2025-06-01T07:30:00.000Z',
        'signingKeyId:key_01',
      ].join('\n'),
    );
  });

  it('renders a null graduationYear as an empty value, keeping the field present', () => {
    const payload = buildPublicSignaturePayload({
      ...BASE,
      graduationYear: null,
    });

    // The line must still exist — dropping it would shift the payload by one
    // field and change every byte after it.
    expect(payload).toContain('\ngraduationYear:\n');
    expect(payload.split('\n')).toHaveLength(10);
    expect(payload.split('\n')[7]).toBe('graduationYear:');
  });

  it('distinguishes a null graduationYear from the string "null" and from 0', () => {
    const asNull = buildPublicSignaturePayload({
      ...BASE,
      graduationYear: null,
    });
    const asZero = buildPublicSignaturePayload({ ...BASE, graduationYear: 0 });

    expect(asNull).not.toBe(asZero);
    expect(asNull).not.toContain('graduationYear:null');
    expect(asNull).not.toContain('graduationYear:undefined');
    expect(asZero).toContain('graduationYear:0');
  });

  it('collapses internal whitespace and trims the normalised text fields', () => {
    const payload = buildPublicSignaturePayload({
      ...BASE,
      issuerDomain: '  univ.ac.id  ',
      issuerName: '  Universitas    Contoh\t\tNegeri  ',
      studentName: '\nSiti   Rahmawati ',
      studentId: ' 2021010101 ',
      degree: 'Sarjana\n\nTeknik   Informatika',
    });

    expect(payload).toBe(
      [
        'credentialId:crd_0123456789abcdef01',
        'verificationId:vrf_0123456789abcdef01',
        'issuerDomain:univ.ac.id',
        'issuerName:Universitas Contoh Negeri',
        'studentName:Siti Rahmawati',
        'studentId:2021010101',
        'degree:Sarjana Teknik Informatika',
        'graduationYear:2025',
        'issuedAt:2025-06-01T07:30:00.000Z',
        'signingKeyId:key_01',
      ].join('\n'),
    );
  });

  it('normalises so that cosmetically different input signs identically', () => {
    // Same credential, retyped with sloppy spacing. It must produce the same
    // bytes, or re-issuing the same record would not verify against its proof.
    const tidy = buildPublicSignaturePayload(BASE);
    const sloppy = buildPublicSignaturePayload({
      ...BASE,
      issuerName: ' Universitas  Contoh ',
      studentName: 'Siti  Rahmawati',
    });

    expect(sloppy).toBe(tidy);
  });

  it('does not normalise the identifier fields', () => {
    // credentialId, verificationId and signingKeyId are generated, never typed,
    // so they are interpolated raw. Locking that in documents the asymmetry.
    const payload = buildPublicSignaturePayload({
      ...BASE,
      credentialId: ' crd_x ',
      signingKeyId: ' key_x ',
    });

    expect(payload).toContain('credentialId: crd_x ');
    expect(payload).toContain('signingKeyId: key_x ');
  });

  it('keeps non-ASCII and delimiter-like characters in names intact', () => {
    const payload = buildPublicSignaturePayload({
      ...BASE,
      studentName: "Ngô Bảo Châu-O'Brien",
      degree: 'Sarjana Ekonomi (Akuntansi), S.E.',
      issuerName: 'Universitas "Contoh" & Rekan: Jakarta',
    });

    expect(payload).toContain("studentName:Ngô Bảo Châu-O'Brien");
    expect(payload).toContain('degree:Sarjana Ekonomi (Akuntansi), S.E.');
    expect(payload).toContain(
      'issuerName:Universitas "Contoh" & Rekan: Jakarta',
    );
    // A colon inside a value must not create an eleventh line.
    expect(payload.split('\n')).toHaveLength(10);
  });

  it('serialises issuedAt as a UTC ISO string, not a locale rendering', () => {
    const payload = buildPublicSignaturePayload({
      ...BASE,
      issuedAt: new Date(Date.UTC(2024, 0, 2, 3, 4, 5, 678)),
    });

    expect(payload).toContain('issuedAt:2024-01-02T03:04:05.678Z');
  });

  it('signs the same bytes for two Date objects representing the same instant', () => {
    const fromIso = buildPublicSignaturePayload({
      ...BASE,
      issuedAt: new Date('2025-06-01T07:30:00.000Z'),
    });
    const fromEpoch = buildPublicSignaturePayload({
      ...BASE,
      issuedAt: new Date(Date.parse('2025-06-01T09:30:00.000+02:00')),
    });

    expect(fromEpoch).toBe(fromIso);
  });

  // The defining property of anything that gets signed: touch one input, and the
  // signed bytes must move. A field silently omitted from the payload would make
  // it editable after signing without breaking the signature.
  describe('every field is actually covered by the signature', () => {
    const mutations: Array<[string, Partial<PublicCredentialPayload>]> = [
      ['credentialId', { credentialId: 'crd_ffffffffffffffffff' }],
      ['verificationId', { verificationId: 'vrf_ffffffffffffffffff' }],
      ['issuerDomain', { issuerDomain: 'other.ac.id' }],
      ['issuerName', { issuerName: 'Universitas Lain' }],
      ['studentName', { studentName: 'Budi Santoso' }],
      ['studentId', { studentId: '2021010102' }],
      ['degree', { degree: 'Sarjana Hukum' }],
      ['graduationYear', { graduationYear: 2026 }],
      ['graduationYear cleared', { graduationYear: null }],
      ['issuedAt', { issuedAt: new Date('2025-06-01T07:30:00.001Z') }],
      ['signingKeyId', { signingKeyId: 'key_02' }],
    ];

    const baseline = buildPublicSignaturePayload(BASE);

    it.each(mutations)('changing %s changes the signed bytes', (_, patch) => {
      expect(buildPublicSignaturePayload({ ...BASE, ...patch })).not.toBe(
        baseline,
      );
    });
  });

  it('is deterministic across repeated calls', () => {
    expect(buildPublicSignaturePayload(BASE)).toBe(
      buildPublicSignaturePayload(BASE),
    );
  });

  it('cannot be confused by a value that looks like another field', () => {
    // Someone naming a student "x\nstudentId:999" must not be able to inject a
    // line that a naive parser would read as a different field. The payload is
    // only ever compared byte-for-byte, and normalizeValue collapses the newline
    // to a space, so the injection cannot survive.
    const payload = buildPublicSignaturePayload({
      ...BASE,
      studentName: 'Budi\nstudentId:999',
    });

    expect(payload.split('\n')).toHaveLength(10);
    expect(payload).toContain('studentName:Budi studentId:999');
    expect(payload).toContain('studentId:2021010101');
  });
});

describe('normalizeValue', () => {
  // Shared with the VC serializer: if these two ever normalise differently, the
  // same credential prints one string on paper and another inside the VC.
  it.each([
    ['  padded  ', 'padded'],
    ['two  spaces', 'two spaces'],
    ['tab\tseparated', 'tab separated'],
    ['newline\nseparated', 'newline separated'],
    ['mixed \t\n runs', 'mixed runs'],
    ['', ''],
    ['   ', ''],
    ['single', 'single'],
  ])('normalises %j to %j', (input, expected) => {
    expect(normalizeValue(input)).toBe(expected);
  });

  it('is idempotent', () => {
    const once = normalizeValue('  a   b \t c  ');
    expect(normalizeValue(once)).toBe(once);
  });
});
