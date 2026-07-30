import type { AppConfigService } from '../../config/app-config.service';
import type { AuditLogService } from '../audit/audit-log.service';
import type { PdfReferenceService } from '../../common/services/pdf-reference.service';
import type { SigningKeyService } from '../../common/signing/signing-key.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { BlockchainQueueService } from '../blockchain/blockchain-queue.service';
import type { InstitutionService } from '../institution/institution.service';
import type { JwtPayload } from '../auth/types/jwt-payload';
import type { CredentialAssetsService } from './credential-assets.service';
import { NotFoundException } from '@nestjs/common';

import { BLOCKCHAIN_OPERATION } from '../blockchain/blockchain.constants';
import { CredentialService } from './credential.service';
import { DEFAULT_CREDENTIAL_PAGE_SIZE } from './dto/list-credentials.dto';

/**
 * `list()` is the one method of this orchestrator that every dashboard load goes
 * through, and the paginated version of it (2.2) was verified by hand against a
 * running API but had nothing pinning it. The three things that can silently
 * regress: the tenant filter, the page window, and the fact that the year
 * dropdown is built from a query of its own rather than from the current page.
 */
describe('CredentialService.list', () => {
  const admin = { sub: 'admin_1', role: 'ADMIN' } as unknown as JwtPayload;

  /** The shape of the `credential.findMany` argument these tests inspect. */
  interface FindManyArgs {
    where: {
      issuerId?: string;
      deletedAt?: null;
      issuedAt?: { gte: Date; lt: Date };
      studentId?: { contains: string; mode: string };
      studentName?: { contains: string; mode: string };
    };
    select?: Record<string, unknown>;
    skip?: number;
    take?: number;
  }

  /** One cast, so the assertions below are typed rather than `any`. */
  const argsOf = (
    mock: jest.MockedFunction<(args: FindManyArgs) => Promise<unknown>>,
    call: number,
  ): FindManyArgs => mock.mock.calls[call][0];

  const build = (rows: Array<{ issuedAt: Date }> = [], total = 0) => {
    const findMany = jest
      .fn<Promise<unknown>, [FindManyArgs]>()
      // first call: the page of credentials
      .mockResolvedValueOnce([])
      // second call: the issuedAt column used for the year list
      .mockResolvedValueOnce(rows);
    const prisma = {
      credential: { findMany, count: jest.fn().mockResolvedValue(total) },
    } as unknown as PrismaService;

    const service = new CredentialService(
      prisma,
      {} as CredentialAssetsService,
      {} as BlockchainQueueService,
      {
        resolveInstitutionId: jest.fn().mockResolvedValue('issuer_1'),
      } as unknown as InstitutionService,
      {} as AppConfigService,
      {} as PdfReferenceService,
      {} as AuditLogService,
      {} as SigningKeyService,
    );

    return { service, prisma, findMany };
  };

  it('defaults to the first page of 25 and scopes to the admin issuer', async () => {
    const { service, findMany } = build();

    const result = await service.list(admin, {});

    const pageQuery = argsOf(findMany, 0);
    expect(pageQuery.skip).toBe(0);
    expect(pageQuery.take).toBe(DEFAULT_CREDENTIAL_PAGE_SIZE);
    expect(pageQuery.where).toMatchObject({
      issuerId: 'issuer_1',
      deletedAt: null,
    });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(DEFAULT_CREDENTIAL_PAGE_SIZE);
  });

  it('turns page and pageSize into the right window', async () => {
    const { service, findMany } = build();

    await service.list(admin, { page: 4, pageSize: 10 });

    expect(argsOf(findMany, 0)).toMatchObject({ skip: 30, take: 10 });
  });

  it('reports the unpaginated total, not the size of the page', async () => {
    const { service } = build([], 200);

    const result = await service.list(admin, { page: 1, pageSize: 25 });

    expect(result.total).toBe(200);
  });

  it('filters by issuance year as a local-time range, not a column match', async () => {
    // Matching on a year range keeps the behaviour the browser had before the
    // filter moved server-side; switching to the graduationYear column would
    // quietly change which rows an operator sees.
    const { service, findMany } = build();

    await service.list(admin, { issuedYear: 2025 });

    expect(argsOf(findMany, 0).where.issuedAt).toEqual({
      gte: new Date(2025, 0, 1),
      lt: new Date(2026, 0, 1),
    });
  });

  it('omits the date filter entirely when no year is asked for', async () => {
    const { service, findMany } = build();

    await service.list(admin, {});

    expect(argsOf(findMany, 0).where.issuedAt).toBeUndefined();
  });

  it('builds the year list from its own query, unpaginated and deduplicated', async () => {
    const { service, findMany } = build([
      { issuedAt: new Date(2024, 5, 1) },
      { issuedAt: new Date(2026, 1, 2) },
      { issuedAt: new Date(2024, 8, 9) },
      { issuedAt: new Date(2025, 0, 1) },
    ]);

    const result = await service.list(admin, { page: 3, pageSize: 25 });

    expect(result.issuedYears).toEqual([2026, 2025, 2024]);

    // The second query must ignore the filters and the page window, or the
    // dropdown would only ever offer the years already on screen.
    const yearQuery = argsOf(findMany, 1);
    expect(yearQuery).toMatchObject({
      where: { issuerId: 'issuer_1', deletedAt: null },
      select: { issuedAt: true },
    });
    expect(yearQuery.skip).toBeUndefined();
    expect(yearQuery.take).toBeUndefined();
  });

  it('trims the student filters and applies them case-insensitively', async () => {
    const { service, findMany } = build();

    await service.list(admin, {
      studentId: '  PAGI-1 ',
      studentName: ' Budi ',
    });

    expect(argsOf(findMany, 0).where).toMatchObject({
      studentId: { contains: 'PAGI-1', mode: 'insensitive' },
      studentName: { contains: 'Budi', mode: 'insensitive' },
    });
  });
});

/**
 * `findOneOrThrow` is the shared read behind the two unauthenticated asset
 * endpoints (`GET /credentials/:id/metadata` and `:id/qr`). It used to call
 * `findUnique({ where: { id } })`, so a credential an admin had soft-deleted
 * still returned the student name, degree, issue date and issuer to anyone
 * holding the id. The filter belongs in this function rather than in the two
 * controllers, because all six call sites route through it.
 */
describe('CredentialService.findOneOrThrow', () => {
  const build = (row: unknown) => {
    const findFirst = jest.fn().mockResolvedValue(row);
    const prisma = {
      credential: { findFirst },
    } as unknown as PrismaService;

    const service = new CredentialService(
      prisma,
      {} as CredentialAssetsService,
      {} as BlockchainQueueService,
      {} as InstitutionService,
      {} as AppConfigService,
      {} as PdfReferenceService,
      {} as AuditLogService,
      {} as SigningKeyService,
    );

    return { service, findFirst };
  };

  it('excludes soft-deleted rows from the query', async () => {
    const { service, findFirst } = build({ id: 'cred_1' });

    await service.findOneOrThrow('cred_1');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cred_1', deletedAt: null },
      }),
    );
  });

  it('is a 404, not an empty 200, when the row is soft-deleted', async () => {
    const { service } = build(null);

    await expect(service.findOneOrThrow('cred_1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

/**
 * The bulk path used to swallow an enqueue failure into a `logger.warn` and
 * nothing else — no credential column, no lifecycle row — while the single
 * revoke next to it recorded both. Revoking 200 credentials with Redis down
 * therefore left 200 rows still reading ANCHORED, with the only evidence on
 * stdout. What the recorded status means is pinned in
 * `blockchain-queue.service.spec.ts`; this pins that the bulk path records at
 * all.
 */
describe('CredentialService.bulkRevoke', () => {
  const admin = {
    sub: 'admin_1',
    email: 'admin@example.test',
    username: 'admin',
    role: 'ADMIN',
  } as unknown as JwtPayload;

  const build = () => {
    const tx = {
      credential: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const existing = {
      id: 'cred_1',
      issuerId: 'issuer_1',
      revoked: false,
      studentName: 'Budi',
      degree: 'S.Kom',
    };
    const prisma = {
      credential: {
        // The batch is fetched with one findMany rather than a findUnique per
        // id, so a bulk call costs a fixed number of round trips.
        findMany: jest.fn().mockResolvedValue([existing]),
        findUnique: jest.fn().mockResolvedValue(existing),
      },
      $transaction: jest.fn((cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
    } as unknown as PrismaService;

    const markQueueFailure = jest.fn().mockResolvedValue(undefined);
    const blockchainQueue = {
      enqueueRevoke: jest
        .fn()
        .mockRejectedValue(new Error('redis unreachable')),
      markQueueFailure,
    } as unknown as BlockchainQueueService;

    const service = new CredentialService(
      prisma,
      {} as CredentialAssetsService,
      blockchainQueue,
      {
        resolveInstitutionId: jest.fn().mockResolvedValue('issuer_1'),
      } as unknown as InstitutionService,
      {} as AppConfigService,
      {} as PdfReferenceService,
      {} as AuditLogService,
      {} as SigningKeyService,
    );

    return { service, markQueueFailure };
  };

  it('records a failed revoke enqueue instead of only logging it', async () => {
    const { service, markQueueFailure } = build();

    const result = await service.bulkRevoke(
      admin,
      ['cred_1'],
      'DATA_CORRECTION',
    );

    expect(markQueueFailure).toHaveBeenCalledWith(
      'cred_1',
      BLOCKCHAIN_OPERATION.revoke,
      'redis unreachable',
    );
    // Still counted as revoked: the database revocation did commit, only the
    // chain write is outstanding.
    expect(result.revoked).toBe(1);
  });
});
