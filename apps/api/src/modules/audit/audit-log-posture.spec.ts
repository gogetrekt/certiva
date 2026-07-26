import { Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService, type AuditEventInput } from './audit-log.service';

/**
 * The two failure postures of AuditLogService.log(). These are the reason a key
 * rotation cannot silently lose its audit entry, so they are asserted directly
 * rather than through a caller.
 */
describe('AuditLogService failure posture', () => {
  const event: AuditEventInput = {
    action: 'SIGNING_KEY_ROTATED',
    targetType: 'IssuerSigningKey',
    targetId: 'sk_test',
    context: { actorAdminId: 'admin_1', actorUsername: 'owner' },
  };

  /** Minimal transaction client — only what writeEntry touches. */
  function makeTx(options: { createThrows?: boolean } = {}) {
    const state = { lockCalls: 0, created: [] as unknown[] };
    const client = {
      // Called as a tagged template for the advisory lock.
      $executeRaw: () => {
        state.lockCalls += 1;
        return Promise.resolve(1);
      },
      auditLog: {
        findFirst: () => Promise.resolve(null),
        create: (args: { data: unknown }) => {
          if (options.createThrows) {
            return Promise.reject(new Error('audit chain unavailable'));
          }
          state.created.push(args.data);
          return Promise.resolve(args.data);
        },
      },
    };
    return { state, client: client as never };
  }

  /** A tx was passed, so log() must never reach for its own transaction. */
  const prisma = {
    $transaction: () => {
      throw new Error('log(tx) must not open its own transaction');
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    // The fail-open path logs the swallowed error; keep test output clean.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('swallows a write failure when no transaction is passed (fail-open)', async () => {
    const failingPrisma = {
      $transaction: () => Promise.reject(new Error('audit chain unavailable')),
    } as unknown as PrismaService;

    // Must resolve: an audit outage may never break the primary operation.
    await expect(
      new AuditLogService(failingPrisma).log(event),
    ).resolves.toBeUndefined();
  });

  it('propagates a write failure when a transaction is passed (fail-closed)', async () => {
    const tx = makeTx({ createThrows: true });

    await expect(
      new AuditLogService(prisma).log(event, tx.client),
    ).rejects.toThrow('audit chain unavailable');
  });

  it('takes the chain lock before writing on the transactional path', async () => {
    const tx = makeTx();

    await new AuditLogService(prisma).log(event, tx.client);

    expect(tx.state.lockCalls).toBe(1);
    expect(tx.state.created).toHaveLength(1);
  });
});
