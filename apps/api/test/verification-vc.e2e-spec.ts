import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { SigningKeyService } from './../src/common/signing/signing-key.service';

/**
 * DB-backed check of the VC export endpoint, specifically the revocation path.
 *
 * The unit suite can prove the document is built and signed correctly, but not
 * that a revoked credential actually stops being served — that answer depends on
 * a real query against real rows, which is exactly where an inverted condition
 * or a missed `deletedAt` would hide. So this runs against Postgres.
 *
 *   pnpm --filter api test:e2e
 */
const SUFFIX = 'vce2e';
const CREDENTIAL_ID = `crd_${SUFFIX}`;
const UNSIGNED_ID = `crd_${SUFFIX}_unsigned`;
const DOMAIN = 'verify.e2e-kampus.ac.id';

describe('GET /api/verification/:credentialId/vc (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let issuerId: string;

  async function cleanup() {
    await prisma.credential.deleteMany({
      where: { credentialExternalId: { in: [CREDENTIAL_ID, UNSIGNED_ID] } },
    });
    await prisma.issuerSigningKey.deleteMany({ where: { issuerId } });
    await prisma.issuer.deleteMany({ where: { id: issuerId } });
  }

  function credentialData(overrides: Record<string, unknown> = {}) {
    const id = String(overrides.credentialExternalId ?? CREDENTIAL_ID);
    return {
      credentialExternalId: id,
      verificationId: `vrf_${id}`,
      verificationCode: `CV-${id}`,
      signedVerificationToken: `svt_${id}`,
      qrPayload: `https://${DOMAIN}/verify/${id}`,
      studentName: 'Siti Rahma',
      studentId: '20250001',
      degree: 'Sarjana Teknik Informatika',
      graduationYear: 2025,
      metadataUri: `https://${DOMAIN}/meta/${id}.json`,
      metadataJson: {},
      qrCodeUri: `https://${DOMAIN}/qr/${id}.png`,
      verificationUrl: `https://${DOMAIN}/verify/${id}`,
      hash: `hash_${id}`,
      registryHash: `registry_${id}`,
      chainProofHash: `chain_${id}`,
      issuerId,
      issuedAt: new Date('2026-01-15T04:05:06.000Z'),
      ...overrides,
    };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
    const signingKeyService = app.get(SigningKeyService);

    const issuer = await prisma.issuer.create({
      data: {
        name: 'Universitas E2E',
        displayName: 'Universitas E2E',
        domain: DOMAIN,
        status: 'ACTIVE',
      },
    });
    issuerId = issuer.id;

    // Sign through the real service so the stored proof is the one production
    // would produce, not a fixture that could drift from it.
    const signature = await signingKeyService.signCredential({
      issuerId,
      credentialId: CREDENTIAL_ID,
      verificationId: `vrf_${CREDENTIAL_ID}`,
      issuerDomain: DOMAIN,
      issuerName: 'Universitas E2E',
      studentName: 'Siti Rahma',
      studentId: '20250001',
      degree: 'Sarjana Teknik Informatika',
      graduationYear: 2025,
      issuedAt: new Date('2026-01-15T04:05:06.000Z'),
    });

    await prisma.credential.create({
      data: credentialData({
        publicPayload: signature.publicPayload,
        signature: signature.signature,
        signedAt: signature.signedAt,
        signingKeyId: signature.signingKeyDbId,
        vcProofValue: signature.vcProofValue,
        vcProofCreated: signature.vcProofCreated,
      }),
    });

    await prisma.credential.create({
      data: credentialData({ credentialExternalId: UNSIGNED_ID }),
    });
  });

  afterAll(async () => {
    if (prisma) await cleanup();
    if (app) await app.close();
  });

  it('serves a signed VC for an active credential', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/verification/${CREDENTIAL_ID}/vc`)
      .expect(200);

    expect(response.body.type).toEqual([
      'VerifiableCredential',
      'OpenBadgeCredential',
    ]);
    expect(response.body.issuer.id).toBe(`did:web:${DOMAIN}`);
    expect(response.body.proof.cryptosuite).toBe('eddsa-jcs-2022');
    expect(String(response.body.proof.proofValue).startsWith('z')).toBe(true);
    expect(response.body.proof['@context']).toEqual(response.body['@context']);
  });

  it('is 404 when the credential has no VC proof stored', async () => {
    await request(app.getHttpServer())
      .get(`/api/verification/${UNSIGNED_ID}/vc`)
      .expect(404);
  });

  it('is 410 with no document body once the credential is revoked', async () => {
    await prisma.credential.update({
      where: { credentialExternalId: CREDENTIAL_ID },
      data: { revoked: true, revokedAt: new Date() },
    });

    const response = await request(app.getHttpServer())
      .get(`/api/verification/${CREDENTIAL_ID}/vc`)
      .expect(410);

    // The whole point: nothing that could be mistaken for a valid credential
    // leaks out alongside the 410.
    const body = JSON.stringify(response.body);
    expect(body).not.toContain('proofValue');
    expect(body).not.toContain('OpenBadgeCredential');
    expect(body).not.toContain('Siti Rahma');

    await prisma.credential.update({
      where: { credentialExternalId: CREDENTIAL_ID },
      data: { revoked: false, revokedAt: null },
    });
  });

  it('is 410 when the credential is soft-deleted but not flagged revoked', async () => {
    await prisma.credential.update({
      where: { credentialExternalId: CREDENTIAL_ID },
      data: { deletedAt: new Date() },
    });

    await request(app.getHttpServer())
      .get(`/api/verification/${CREDENTIAL_ID}/vc`)
      .expect(410);

    await prisma.credential.update({
      where: { credentialExternalId: CREDENTIAL_ID },
      data: { deletedAt: null },
    });
  });

  it('serves the VC again once the revocation is lifted', async () => {
    await request(app.getHttpServer())
      .get(`/api/verification/${CREDENTIAL_ID}/vc`)
      .expect(200);
  });
});
