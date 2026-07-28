import type { AppConfigService } from '../../config/app-config.service';
import type { PdfReferenceService } from '../../common/services/pdf-reference.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditLogService } from '../audit/audit-log.service';
import type { InstitutionService } from '../institution/institution.service';
import type { DocumentProofAssetsService } from './document-proof-assets.service';
import { DocumentProofService } from './document-proof.service';

/**
 * This is what an unauthenticated caller reaches. Two things are worth pinning:
 * the verdict a document gets, and the fact that a miss says nothing about what
 * does exist.
 *
 * `REVOKED` outranking `AUTHENTIC` is the case to guard hardest: a revoked
 * document still hashes correctly, so a verdict derived from the hash alone
 * would report a withdrawn document as genuine.
 */
describe('DocumentProofService verification verdicts', () => {
  const build = () => {
    const service = new DocumentProofService(
      {} as PrismaService,
      {} as InstitutionService,
      {
        // URL/URI shaping is this collaborator's job and has its own tests; here
        // it only has to answer something so the verdict can be built.
        resolveProofUrl: (_id: string, url: string) => url,
        resolveMetadataUri: (_id: string, uri: string) => uri,
        resolveQrCodeUri: (_id: string, uri: string) => uri,
      } as unknown as DocumentProofAssetsService,
      { appEnv: 'development' } as unknown as AppConfigService,
      {} as PdfReferenceService,
      {} as AuditLogService,
    );

    // The counter/timestamp update is a database concern; these tests are about
    // the verdict, so it echoes the row back unchanged.
    const recordVerification = jest
      .spyOn(
        service as unknown as {
          recordVerification: (input: unknown) => Promise<unknown>;
        },
        'recordVerification',
      )
      .mockImplementation(() => Promise.resolve(null));

    return { service, recordVerification };
  };

  const proof = (overrides: Record<string, unknown> = {}) =>
    ({
      id: 'proof_1',
      proofExternalId: 'dpf_a1b2c3d4e5f6a7',
      verificationId: 'vrf_1',
      verificationCode: 'DP-A1B2C3D4',
      sourceHash: 'a'.repeat(64),
      revoked: false,
      revokedAt: null,
      revocationReason: null,
      title: 'Ijazah',
      documentType: 'DIPLOMA',
      referenceNumber: null,
      documentDate: null,
      proofUrl: 'https://certiva.test/proof/dpf_a1b2c3d4e5f6a7',
      metadataUri: 'local://x/metadata.json',
      qrCodeUri: 'local://x/qr.png',
      registeredAt: new Date('2026-01-01T00:00:00Z'),
      verificationCount: 0,
      verifiedAt: null,
      txHash: null,
      chainId: null,
      blockNumber: null,
      anchoredAt: null,
      anchorStatus: 'PENDING',
      chainStatus: 'PENDING',
      issuer: { name: 'Universitas Contoh', displayName: 'Universitas Contoh' },
      ...overrides,
    }) as never;

  const verify = (
    service: DocumentProofService,
    row: never,
    comparedHash: string,
  ) =>
    (
      service as unknown as {
        buildVerificationResponse: (
          proof: never,
          ipAddress: string,
          createdAt: Date,
          sourceType: string,
          uploadedHash: string | null,
          comparedHash: string,
        ) => Promise<{ status: string; authentic: boolean }>;
      }
    ).buildVerificationResponse(
      row,
      '203.0.113.7',
      new Date('2026-07-29T00:00:00Z'),
      'PDF_UPLOAD',
      comparedHash,
      comparedHash,
    );

  it('reports AUTHENTIC when the hash matches and nothing is revoked', async () => {
    const { service } = build();

    const result = await verify(service, proof(), 'a'.repeat(64));

    expect(result.status).toBe('AUTHENTIC');
    expect(result.authentic).toBe(true);
  });

  it('reports DOCUMENT_MODIFIED when the hash differs', async () => {
    const { service } = build();

    const result = await verify(service, proof(), 'b'.repeat(64));

    expect(result.status).toBe('DOCUMENT_MODIFIED');
    expect(result.authentic).toBe(false);
  });

  it('reports REVOKED even when the hash matches perfectly', async () => {
    const { service } = build();

    const result = await verify(
      service,
      proof({ revoked: true, revokedAt: new Date('2026-06-01T00:00:00Z') }),
      'a'.repeat(64),
    );

    expect(result.status).toBe('REVOKED');
    expect(result.authentic).toBe(false);
  });

  it('reports REVOKED, not DOCUMENT_MODIFIED, when a revoked document is also altered', async () => {
    const { service } = build();

    const result = await verify(
      service,
      proof({ revoked: true }),
      'b'.repeat(64),
    );

    expect(result.status).toBe('REVOKED');
  });

  it('does not count a revoked document as a match in the verification record', async () => {
    const { service, recordVerification } = build();

    await verify(service, proof({ revoked: true }), 'a'.repeat(64));

    expect(recordVerification).toHaveBeenCalledWith(
      expect.objectContaining({ matched: false, status: 'REVOKED' }),
    );
  });

  it('records the match for a genuine document', async () => {
    const { service, recordVerification } = build();

    await verify(service, proof(), 'a'.repeat(64));

    expect(recordVerification).toHaveBeenCalledWith(
      expect.objectContaining({ matched: true, status: 'AUTHENTIC' }),
    );
  });

  describe('the not-found response', () => {
    it('answers NOT_FOUND with every identifying field null', () => {
      const { service } = build();

      const result = (
        service as unknown as {
          buildNotFoundResponse: (createdAt: Date) => Record<string, unknown>;
        }
      ).buildNotFoundResponse(new Date('2026-07-29T00:00:00Z'));

      expect(result.status).toBe('NOT_FOUND');
      expect(result.authentic).toBe(false);
      // A miss must not become an oracle for what does exist — no issuer, no
      // title, no hash, no reference leaks out of a lookup that failed.
      for (const field of [
        'verificationId',
        'verificationCode',
        'title',
        'documentType',
        'issuedBy',
        'registeredHash',
        'proofUrl',
      ]) {
        expect(result[field]).toBeNull();
      }
    });
  });
});
