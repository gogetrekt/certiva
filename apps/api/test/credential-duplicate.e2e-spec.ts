import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * Locks the partial unique index `credential_issuer_student_degree_active_key`
 * (migration 20260727100000_credential_active_unique_index).
 *
 * The application-layer duplicate check in `bulkIssue` reads existing keys
 * before the commit loop, so two concurrent commits both pass it and both
 * insert; `create()` never checked at all. The guarantee therefore has to come
 * from the database, and these tests assert the database itself refuses the
 * second live credential — no service code is involved on purpose, so a
 * refactor of the service cannot make the test pass while the constraint is
 * gone.
 *
 * The WHERE clause is the half most easily lost in a rewrite, so the
 * revoke-then-reissue case is asserted just as hard as the rejection case.
 */
describe('Credential active-duplicate constraint (e2e, requires database)', () => {
  const prisma = new PrismaClient();
  const suffix = `dupe-${process.pid}`;
  let issuerId: string;

  const credentialData = (n: number) => ({
    credentialExternalId: `ext-${suffix}-${n}`,
    verificationId: `vid-${suffix}-${n}`,
    verificationCode: `code-${suffix}-${n}`,
    signedVerificationToken: `tok-${suffix}-${n}`,
    qrPayload: '{}',
    studentName: 'Duplicate Probe',
    studentId: `student-${suffix}`,
    degree: 'S1 Teknik Informatika',
    metadataUri: `file://metadata-${n}`,
    metadataJson: {},
    qrCodeUri: `file://qr-${n}`,
    verificationUrl: `http://localhost/verify/${suffix}-${n}`,
    hash: `hash-${suffix}-${n}`,
    registryHash: `registry-${suffix}-${n}`,
    chainProofHash: `chain-${suffix}-${n}`,
    issuerId,
  });

  beforeAll(async () => {
    const issuer = await prisma.issuer.create({
      data: {
        name: `Duplicate Probe University ${process.pid}`,
        domain: `${suffix}.test`,
        wallet: `0x${process.pid.toString(16).padStart(40, '0')}`,
      },
    });
    issuerId = issuer.id;
  });

  afterEach(async () => {
    await prisma.credential.deleteMany({ where: { issuerId } });
  });

  afterAll(async () => {
    await prisma.credential.deleteMany({ where: { issuerId } });
    await prisma.issuer.delete({ where: { id: issuerId } });
    await prisma.$disconnect();
  });

  it('rejects a second live credential for the same issuer, student and degree', async () => {
    await prisma.credential.create({ data: credentialData(1) });

    // Every other column is unique per row, so a P2002 here can only come from
    // the composite index and nothing else.
    await expect(
      prisma.credential.create({ data: credentialData(2) }),
    ).rejects.toMatchObject({
      code: 'P2002',
      meta: { target: ['issuerId', 'studentId', 'degree'] },
    });

    expect(await prisma.credential.count({ where: { issuerId } })).toBe(1);
  });

  it('allows re-issuance after the first credential is revoked', async () => {
    const first = await prisma.credential.create({ data: credentialData(1) });
    await prisma.credential.update({
      where: { id: first.id },
      data: { revoked: true, revokedAt: new Date() },
    });

    // This is the case a plain @@unique([issuerId, studentId, degree]) would
    // break permanently: the revoked row stays in the table, so without the
    // WHERE clause the pair is locked forever and DATA_CORRECTION reissues
    // become impossible without a hard delete.
    await expect(
      prisma.credential.create({ data: credentialData(2) }),
    ).resolves.toMatchObject({ revoked: false });

    expect(await prisma.credential.count({ where: { issuerId } })).toBe(2);
  });

  it('allows re-issuance after the first credential is soft-deleted', async () => {
    const first = await prisma.credential.create({ data: credentialData(1) });
    await prisma.credential.update({
      where: { id: first.id },
      data: { revoked: true, deletedAt: new Date() },
    });

    await expect(
      prisma.credential.create({ data: credentialData(2) }),
    ).resolves.toMatchObject({ deletedAt: null });
  });

  it('lets exactly one of two concurrent inserts win', async () => {
    // The race the pre-loop `existingKeys` read cannot cover: both callers read
    // "not present" and both insert. Exactly one must survive.
    const results = await Promise.allSettled([
      prisma.credential.create({ data: credentialData(1) }),
      prisma.credential.create({ data: credentialData(2) }),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);

    const rejection = results.find((r) => r.status === 'rejected');
    expect(rejection?.reason).toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
    expect(rejection?.reason).toMatchObject({ code: 'P2002' });

    expect(await prisma.credential.count({ where: { issuerId } })).toBe(1);
  });
});
