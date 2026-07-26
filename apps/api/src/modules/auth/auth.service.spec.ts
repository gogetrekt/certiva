import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Admin, AdminRole } from '@prisma/client';

import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { InstitutionService } from '../institution/institution.service';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { AuthService } from './auth.service';
import type { JwtPayload } from './types/jwt-payload';

/**
 * Every test here is a negative control: it attempts something SECURITY.md says
 * is forbidden and asserts it is refused. A positive-only suite would pass just
 * as happily against a service with all of these guards deleted.
 */

type AdminRow = Admin;

let seq = 0;

function makeAdmin(overrides: Partial<AdminRow> = {}): AdminRow {
  seq += 1;
  return {
    id: `adm_${seq}`,
    username: `user${seq}`,
    email: `user${seq}@example.test`,
    password: '$2b$12$hashhashhashhashhashhashhashhashhashhashhashhashhashha',
    role: 'ADMIN',
    active: true,
    tokenVersion: 0,
    issuerId: 'inst_1',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/** In-memory stand-in for the slice of the Admin table these paths touch. */
class FakeAdminStore {
  rows: AdminRow[] = [];
  /** Counts activity rows so deleteAdmin's activity check can be steered. */
  activityCount = 0;

  admin = {
    findUnique: (args: {
      where: { id?: string; username?: string };
    }): Promise<AdminRow | null> =>
      Promise.resolve(
        this.rows.find(
          (r) =>
            (args.where.id !== undefined && r.id === args.where.id) ||
            (args.where.username !== undefined &&
              r.username === args.where.username),
        ) ?? null,
      ),

    findFirst: (args: {
      where: { OR?: Array<{ username?: string; email?: string }> };
    }): Promise<AdminRow | null> => {
      const clauses = args.where.OR ?? [];
      return Promise.resolve(
        this.rows.find((r) =>
          clauses.some(
            (c) =>
              (c.username !== undefined && r.username === c.username) ||
              (c.email !== undefined && r.email === c.email),
          ),
        ) ?? null,
      );
    },

    count: (args: {
      where: {
        role?: AdminRole;
        active?: boolean;
        id?: { not: string };
      };
    }): Promise<number> => {
      const { role, active, id } = args.where;
      return Promise.resolve(
        this.rows.filter(
          (r) =>
            (role === undefined || r.role === role) &&
            (active === undefined || r.active === active) &&
            (id === undefined || r.id !== id.not),
        ).length,
      );
    },

    update: (args: {
      where: { id: string };
      data: {
        role?: AdminRole;
        active?: boolean;
        tokenVersion?: { increment: number };
      };
    }): Promise<AdminRow> => {
      const row = this.rows.find((r) => r.id === args.where.id);
      if (!row) throw new Error('update on missing row');
      if (args.data.role !== undefined) row.role = args.data.role;
      if (args.data.active !== undefined) row.active = args.data.active;
      if (args.data.tokenVersion) {
        row.tokenVersion += args.data.tokenVersion.increment;
      }
      return Promise.resolve(row);
    },

    delete: (args: { where: { id: string } }): Promise<AdminRow> => {
      const i = this.rows.findIndex((r) => r.id === args.where.id);
      if (i === -1) throw new Error('delete on missing row');
      return Promise.resolve(this.rows.splice(i, 1)[0]);
    },

    create: (args: { data: Partial<AdminRow> }): Promise<AdminRow> => {
      const row = makeAdmin(args.data);
      this.rows.push(row);
      return Promise.resolve(row);
    },
  };

  // deleteAdmin fans several counts out through $transaction; only whether the
  // total is non-zero matters to the guard under test.
  issuanceBatch = { count: () => Promise.resolve(this.activityCount) };
  credential = { count: () => Promise.resolve(0) };
  credentialDocumentProof = { count: () => Promise.resolve(0) };
  secureDocumentProof = { count: () => Promise.resolve(0) };

  $transaction = (ops: Array<Promise<number>>): Promise<number[]> =>
    Promise.all(ops);
}

function buildService(store: FakeAdminStore) {
  const auditLog = { log: jest.fn().mockResolvedValue(undefined) };

  const service = new AuthService(
    store as unknown as PrismaService,
    { sign: () => 'token' } as unknown as JwtService,
    { jwtExpiresIn: '1h' } as unknown as AppConfigService,
    {
      getInstitution: () => Promise.resolve({ id: 'inst_1' }),
    } as unknown as InstitutionService,
    auditLog as unknown as AuditLogService,
  );

  return { service, auditLog };
}

function actorFor(admin: AdminRow): JwtPayload {
  return {
    sub: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    issuerId: admin.issuerId,
    tokenVersion: admin.tokenVersion,
    active: admin.active,
  };
}

describe('AuthService — the last active OWNER is protected', () => {
  it('refuses to deactivate the only active OWNER', async () => {
    // The actor here is a *different* OWNER row that is itself inactive. That
    // combination is what isolates the last-active-OWNER guard: if the actor
    // were the target, the self-disable guard would fire first and this test
    // would pass without the OWNER-count check existing at all. An inactive
    // actor should never get past JwtStrategy in production — this is the
    // service's own defence in depth, tested on its own terms.
    const store = new FakeAdminStore();
    const target = makeAdmin({ role: 'OWNER', active: true });
    const actor = makeAdmin({ role: 'OWNER', active: false });
    store.rows.push(target, actor);
    const { service } = buildService(store);

    await expect(
      service.updateAdmin(actorFor(actor), target.id, { active: false }),
    ).rejects.toThrow(/last active OWNER/);

    expect(target.active).toBe(true);
  });

  it('refuses to demote the only active OWNER', async () => {
    const store = new FakeAdminStore();
    const owner = makeAdmin({ role: 'OWNER' });
    store.rows.push(owner);
    const { service } = buildService(store);

    await expect(
      service.updateAdmin(actorFor(owner), owner.id, {
        role: 'ADMIN',
      }),
    ).rejects.toThrow(/last active OWNER/);

    expect(store.rows[0].role).toBe('OWNER');
  });

  it('does not count an inactive OWNER as a surviving OWNER', async () => {
    // A disabled OWNER cannot log in, so demoting the last *active* one would
    // still lock the institution out.
    const store = new FakeAdminStore();
    const active = makeAdmin({ role: 'OWNER' });
    const disabled = makeAdmin({ role: 'OWNER', active: false });
    store.rows.push(active, disabled);
    const { service } = buildService(store);

    await expect(
      service.updateAdmin(actorFor(active), active.id, {
        role: 'ADMIN',
      }),
    ).rejects.toThrow(/last active OWNER/);
  });

  it('allows demoting an OWNER once a second active OWNER exists', async () => {
    // The positive control that proves the guard is counting, not blanket-denying.
    const store = new FakeAdminStore();
    const first = makeAdmin({ role: 'OWNER' });
    const second = makeAdmin({ role: 'OWNER' });
    store.rows.push(first, second);
    const { service } = buildService(store);

    await expect(
      service.updateAdmin(actorFor(first), second.id, {
        role: 'ADMIN',
      }),
    ).resolves.toBeDefined();

    expect(store.rows[1].role).toBe('ADMIN');
  });

  it('leaves the sole OWNER no route to remove itself', async () => {
    // Deletion requires deactivation first. Deactivating the last OWNER is
    // refused, and self-deletion is refused outright, so neither the one-step
    // nor the two-step route gets there.
    const store = new FakeAdminStore();
    const owner = makeAdmin({ role: 'OWNER' });
    store.rows.push(owner);
    const { service } = buildService(store);

    await expect(
      service.updateAdmin(actorFor(owner), owner.id, { active: false }),
    ).rejects.toThrow('Cannot disable your own admin account');

    await expect(
      service.deleteAdmin(actorFor(owner), owner.id),
    ).rejects.toThrow('Cannot delete your own admin account');

    expect(store.rows).toHaveLength(1);
    expect(store.rows[0].active).toBe(true);
  });

  it('refuses to delete the last OWNER on behalf of another admin', async () => {
    // A SUPER_ADMIN cannot reach an OWNER row at all, so it cannot use the
    // "someone else does it" route around the self-delete guard either.
    const store = new FakeAdminStore();
    const superAdmin = makeAdmin({ role: 'SUPER_ADMIN' });
    const owner = makeAdmin({ role: 'OWNER', active: false });
    store.rows.push(superAdmin, owner);
    const { service } = buildService(store);

    await expect(
      service.deleteAdmin(actorFor(superAdmin), owner.id),
    ).rejects.toThrow('Cannot delete an OWNER account');

    expect(store.rows).toHaveLength(2);
  });
});

describe('AuthService — an admin cannot disable itself', () => {
  it('refuses a self-targeted active:false', async () => {
    const store = new FakeAdminStore();
    const admin = makeAdmin({ role: 'SUPER_ADMIN' });
    store.rows.push(admin);
    const { service } = buildService(store);

    await expect(
      service.updateAdmin(actorFor(admin), admin.id, { active: false }),
    ).rejects.toThrow('Cannot disable your own admin account');

    expect(store.rows[0].active).toBe(true);
  });

  it('checks self-disable before the account even has to exist', async () => {
    // The guard is on actor.sub === adminId, so it must not be reachable only
    // via a row lookup that could be made to miss.
    const store = new FakeAdminStore();
    const admin = makeAdmin({ role: 'OWNER' });
    const { service } = buildService(store); // store is empty on purpose

    await expect(
      service.updateAdmin(actorFor(admin), admin.id, { active: false }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('still allows an admin to change something about itself other than active', async () => {
    const store = new FakeAdminStore();
    const owner = makeAdmin({ role: 'OWNER' });
    const other = makeAdmin({ role: 'OWNER' });
    store.rows.push(owner, other);
    const { service } = buildService(store);

    await expect(
      service.updateAdmin(actorFor(owner), owner.id, { active: true }),
    ).resolves.toBeDefined();
  });
});

describe('AuthService — role hierarchy on create', () => {
  it.each([['OWNER'], ['SUPER_ADMIN']])(
    'refuses a SUPER_ADMIN actor creating a %s',
    async (role) => {
      const store = new FakeAdminStore();
      const actor = makeAdmin({ role: 'SUPER_ADMIN' });
      store.rows.push(actor);
      const { service } = buildService(store);

      await expect(
        service.register(
          {
            username: 'newuser',
            password: 'Sup3rSecret!',
            role: role as AdminRole,
          },
          actorFor(actor),
        ),
      ).rejects.toThrow(/Only an OWNER can create/);

      expect(store.rows).toHaveLength(1);
    },
  );

  it.each([['ADMIN'], ['AUDITOR']])(
    'lets a SUPER_ADMIN actor create a %s',
    async (role) => {
      const store = new FakeAdminStore();
      const actor = makeAdmin({ role: 'SUPER_ADMIN' });
      store.rows.push(actor);
      const { service } = buildService(store);

      await expect(
        service.register(
          {
            username: `new${role}`,
            password: 'Sup3rSecret!',
            role: role as AdminRole,
          },
          actorFor(actor),
        ),
      ).resolves.toBeDefined();
    },
  );

  it('refuses to create a second admin with a taken username', async () => {
    const store = new FakeAdminStore();
    const actor = makeAdmin({ role: 'OWNER' });
    store.rows.push(actor, makeAdmin({ username: 'taken' }));
    const { service } = buildService(store);

    await expect(
      service.register(
        { username: 'taken', password: 'Sup3rSecret!' },
        actorFor(actor),
      ),
    ).rejects.toThrow(ConflictException);
  });
});

describe('AuthService — role hierarchy on update', () => {
  it.each([['OWNER'], ['SUPER_ADMIN']])(
    'refuses a SUPER_ADMIN actor assigning the %s role',
    async (role) => {
      const store = new FakeAdminStore();
      const actor = makeAdmin({ role: 'SUPER_ADMIN' });
      const target = makeAdmin({ role: 'ADMIN' });
      store.rows.push(actor, target);
      const { service } = buildService(store);

      await expect(
        service.updateAdmin(actorFor(actor), target.id, {
          role: role as AdminRole,
        }),
      ).rejects.toThrow(/Only an OWNER can assign/);

      expect(target.role).toBe('ADMIN');
    },
  );

  it('refuses a non-OWNER actor modifying an OWNER account at all', async () => {
    const store = new FakeAdminStore();
    const actor = makeAdmin({ role: 'SUPER_ADMIN' });
    const owner = makeAdmin({ role: 'OWNER' });
    store.rows.push(actor, owner);
    const { service } = buildService(store);

    await expect(
      service.updateAdmin(actorFor(actor), owner.id, {
        role: 'AUDITOR',
      }),
    ).rejects.toThrow('Cannot modify an OWNER account');
  });

  it('refuses a non-OWNER actor deleting an OWNER account', async () => {
    const store = new FakeAdminStore();
    const actor = makeAdmin({ role: 'SUPER_ADMIN' });
    const owner = makeAdmin({ role: 'OWNER', active: false });
    store.rows.push(actor, owner);
    const { service } = buildService(store);

    await expect(
      service.deleteAdmin(actorFor(actor), owner.id),
    ).rejects.toThrow('Cannot delete an OWNER account');

    expect(store.rows).toHaveLength(2);
  });

  it('reports a missing target as not found rather than silently succeeding', async () => {
    const store = new FakeAdminStore();
    const actor = makeAdmin({ role: 'OWNER' });
    store.rows.push(actor);
    const { service } = buildService(store);

    await expect(
      service.updateAdmin(actorFor(actor), 'adm_missing', {
        role: 'ADMIN',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('AuthService — deletion preconditions', () => {
  it('refuses to delete an account that is still active', async () => {
    const store = new FakeAdminStore();
    const actor = makeAdmin({ role: 'OWNER' });
    const target = makeAdmin({ active: true });
    store.rows.push(actor, target);
    const { service } = buildService(store);

    await expect(
      service.deleteAdmin(actorFor(actor), target.id),
    ).rejects.toThrow('Deactivate account before deleting');

    expect(store.rows).toHaveLength(2);
  });

  it('refuses to delete an account that has audit-relevant activity', async () => {
    // Deleting it would orphan the actor reference on existing audit rows.
    const store = new FakeAdminStore();
    store.activityCount = 1;
    const actor = makeAdmin({ role: 'OWNER' });
    const target = makeAdmin({ active: false });
    store.rows.push(actor, target);
    const { service } = buildService(store);

    await expect(
      service.deleteAdmin(actorFor(actor), target.id),
    ).rejects.toThrow(ConflictException);

    expect(store.rows).toHaveLength(2);
  });
});

describe('AuthService — tokenVersion invalidates issued sessions', () => {
  it('bumps tokenVersion when an account is disabled', async () => {
    const store = new FakeAdminStore();
    const actor = makeAdmin({ role: 'OWNER' });
    const target = makeAdmin({ tokenVersion: 4 });
    store.rows.push(actor, target);
    const { service } = buildService(store);

    await service.updateAdmin(actorFor(actor), target.id, { active: false });

    expect(target.tokenVersion).toBe(5);
  });

  it('bumps tokenVersion when a role changes', async () => {
    const store = new FakeAdminStore();
    const actor = makeAdmin({ role: 'OWNER' });
    const target = makeAdmin({ role: 'ADMIN', tokenVersion: 1 });
    store.rows.push(actor, target);
    const { service } = buildService(store);

    await service.updateAdmin(actorFor(actor), target.id, {
      role: 'AUDITOR',
    });

    expect(target.tokenVersion).toBe(2);
  });

  it('does not bump tokenVersion for a no-op role write', async () => {
    // Re-submitting the same role must not log every other session out.
    const store = new FakeAdminStore();
    const actor = makeAdmin({ role: 'OWNER' });
    const target = makeAdmin({ role: 'ADMIN', tokenVersion: 3 });
    store.rows.push(actor, target);
    const { service } = buildService(store);

    await service.updateAdmin(actorFor(actor), target.id, {
      role: 'ADMIN',
    });

    expect(target.tokenVersion).toBe(3);
  });
});

describe('AuthService — login refuses disabled and unknown accounts', () => {
  it('rejects a disabled account without revealing that it is disabled', async () => {
    const store = new FakeAdminStore();
    store.rows.push(makeAdmin({ username: 'disabled', active: false }));
    const { service } = buildService(store);

    await expect(
      service.login({ username: 'disabled', password: 'whatever' }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('rejects an unknown username with the same message a wrong password gets', async () => {
    const store = new FakeAdminStore();
    const { service } = buildService(store);

    await expect(
      service.login({ username: 'nobody', password: 'whatever' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('records LOGIN_FAILURE for a rejected attempt', async () => {
    const store = new FakeAdminStore();
    const { service, auditLog } = buildService(store);

    await expect(
      service.login({ username: 'nobody', password: 'whatever' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_FAILURE' }),
    );
  });
});

/**
 * The tokenVersion claim is only worth anything if the strategy that reads every
 * request actually enforces it. These assert the rejection, not the happy path.
 */
describe('JwtStrategy — session invalidation is enforced per request', () => {
  function strategyFor(row: Partial<AdminRow> | null) {
    const prisma = {
      admin: {
        findUnique: () => Promise.resolve(row ? makeAdmin(row) : null),
      },
    };
    return new JwtStrategy(
      {
        jwtSecret: 'test-secret-value-at-least-32-chars-long',
      } as AppConfigService,
      prisma as unknown as PrismaService,
    );
  }

  function payloadWith(overrides: Partial<JwtPayload>): JwtPayload {
    return {
      sub: 'adm_1',
      username: 'user',
      email: 'user@example.test',
      role: 'ADMIN',
      issuerId: 'inst_1',
      tokenVersion: 0,
      active: true,
      ...overrides,
    };
  }

  it('rejects a token whose tokenVersion is behind the stored one', async () => {
    const strategy = strategyFor({ id: 'adm_1', tokenVersion: 7 });

    await expect(
      strategy.validate(payloadWith({ tokenVersion: 6 })),
    ).rejects.toThrow('Session has been invalidated');
  });

  it('rejects a token whose tokenVersion is ahead of the stored one', async () => {
    // A forged or replayed higher version must not pass a `<` style comparison.
    const strategy = strategyFor({ id: 'adm_1', tokenVersion: 2 });

    await expect(
      strategy.validate(payloadWith({ tokenVersion: 3 })),
    ).rejects.toThrow('Session has been invalidated');
  });

  it('rejects a token for an account that has since been disabled', async () => {
    const strategy = strategyFor({
      id: 'adm_1',
      active: false,
      tokenVersion: 0,
    });

    await expect(
      strategy.validate(payloadWith({ tokenVersion: 0 })),
    ).rejects.toThrow('Admin account is inactive');
  });

  it('rejects a token for an account that no longer exists', async () => {
    const strategy = strategyFor(null);

    await expect(strategy.validate(payloadWith({}))).rejects.toThrow(
      'Admin account no longer exists',
    );
  });

  it('trusts the stored row over the token for role and issuer', async () => {
    // A token minted before a demotion must not keep its old role. The strategy
    // returns DB values, so a stale privileged claim cannot survive.
    const strategy = strategyFor({
      id: 'adm_1',
      role: 'AUDITOR',
      tokenVersion: 0,
      issuerId: 'inst_real',
    });

    const result = await strategy.validate(
      payloadWith({
        role: 'OWNER',
        issuerId: 'inst_forged',
        tokenVersion: 0,
      }),
    );

    expect(result.role).toBe('AUDITOR');
    expect(result.issuerId).toBe('inst_real');
  });
});
