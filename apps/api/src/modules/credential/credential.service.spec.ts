import type { AppConfigService } from '../../config/app-config.service';
import type { AuditLogService } from '../audit/audit-log.service';
import type { PdfReferenceService } from '../../common/services/pdf-reference.service';
import type { SigningKeyService } from '../../common/signing/signing-key.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { BlockchainQueueService } from '../blockchain/blockchain-queue.service';
import type { InstitutionService } from '../institution/institution.service';
import type { JwtPayload } from '../auth/types/jwt-payload';
import type { CredentialAssetsService } from './credential-assets.service';
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
