import { IssuerSigningKey } from '@prisma/client';

import {
  AuditLogService,
  type AuditEventInput,
} from '../../modules/audit/audit-log.service';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptedSigningKeyProvider } from './encrypted-signing-key.provider';
import { SigningKeyService } from './signing-key.service';
import { verifyEd25519 } from './signing-crypto.util';

/**
 * In-memory stand-in for the IssuerSigningKey table — just enough of the Prisma
 * surface SigningKeyService touches. Avoids needing a live DB for this unit.
 */
class FakeKeyStore {
  rows: IssuerSigningKey[] = [];
  private seq = 0;

  issuerSigningKey = {
    findFirst: (args: {
      where: { issuerId: string };
    }): Promise<IssuerSigningKey | null> => {
      const match = this.rows
        .filter(
          (r) =>
            r.issuerId === args.where.issuerId &&
            r.active &&
            r.revokedAt === null,
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return Promise.resolve(match[0] ?? null);
    },
    create: (args: {
      data: Omit<IssuerSigningKey, 'id' | 'createdAt' | 'revokedAt'>;
    }): Promise<IssuerSigningKey> => {
      const row: IssuerSigningKey = {
        id: `cuid_${this.seq}`,
        createdAt: new Date(2020, 0, 1 + this.seq),
        revokedAt: null,
        ...args.data,
      };
      this.seq += 1;
      this.rows.push(row);
      return Promise.resolve(row);
    },
    findMany: (args: {
      where: { issuerId: string };
    }): Promise<IssuerSigningKey[]> =>
      Promise.resolve(
        this.rows.filter(
          (r) =>
            r.issuerId === args.where.issuerId &&
            r.active &&
            r.revokedAt === null,
        ),
      ),
    updateMany: (args: {
      where: { issuerId: string };
      data: { active: boolean; revokedAt: Date };
    }): Promise<{ count: number }> => {
      const matched = this.rows.filter(
        (r) =>
          r.issuerId === args.where.issuerId &&
          r.active &&
          r.revokedAt === null,
      );
      for (const row of matched) {
        row.active = args.data.active;
        row.revokedAt = args.data.revokedAt;
      }
      return Promise.resolve({ count: matched.length });
    },
  };

  // The service runs retire+create+audit in one transaction. No real isolation
  // here, but rollback is emulated by restoring a row snapshot when the callback
  // throws — enough to prove the writes happen *inside* the transaction (if the
  // audit write were moved back outside it, the rollback assertion would fail).
  $transaction = async <T>(
    fn: (tx: FakeKeyStore) => Promise<T>,
  ): Promise<T> => {
    const snapshot = this.rows.map((row) => ({ ...row }));
    try {
      return await fn(this);
    } catch (error) {
      this.rows = snapshot;
      throw error;
    }
  };
}

describe('SigningKeyService key rotation', () => {
  const config = {
    signingKeyEncryptionSecret: 'unit-test-master-secret-at-least-32-chars',
  } as AppConfigService;
  function makeService(
    store: FakeKeyStore,
    onAudit: (event: AuditEventInput) => void = () => {},
  ) {
    const auditLog = {
      lockChain: () => Promise.resolve(),
      log: (event: AuditEventInput) => {
        onAudit(event);
        return Promise.resolve();
      },
    } as unknown as AuditLogService;

    return new SigningKeyService(
      store as unknown as PrismaService,
      new EncryptedSigningKeyProvider(config),
      auditLog,
    );
  }

  const payloadInput = {
    issuerId: 'issuer_1',
    credentialId: 'crd_1',
    verificationId: 'vrf_1',
    issuerDomain: 'kampus.ac.id',
    issuerName: 'Universitas X',
    studentName: 'Ada Lovelace',
    studentId: '2020-001',
    degree: 'S.Kom',
    graduationYear: 2020,
    issuedAt: new Date('2020-06-01T00:00:00Z'),
  };

  it('lazy-inits one active key, reuses it, and signs verifiably', async () => {
    const store = new FakeKeyStore();
    const svc = makeService(store);

    const first = await svc.getOrCreateActiveKey('issuer_1');
    const second = await svc.getOrCreateActiveKey('issuer_1');
    expect(store.rows).toHaveLength(1); // reused, not regenerated
    expect(second.id).toBe(first.id);

    const signed = await svc.signCredential(payloadInput);
    expect(
      verifyEd25519(signed.publicPayload, signed.signature, first.publicKey),
    ).toBe(true);
  });

  it('keeps old-key credentials verifiable after rotation (revoked != deleted)', async () => {
    const store = new FakeKeyStore();
    const svc = makeService(store);

    const oldSigned = await svc.signCredential(payloadInput);
    const oldKey = store.rows[0];

    const { created: newKey, retiredKeyIds } = await svc.rotateActiveKey(
      'issuer_1',
      { actorAdminId: 'admin_1', actorUsername: 'owner' },
    );

    expect(newKey.id).not.toBe(oldKey.id);
    expect(newKey.active).toBe(true);
    expect(retiredKeyIds).toEqual([oldKey.keyId]);
    expect(store.rows).toHaveLength(2); // history preserved, nothing deleted
    expect(oldKey.active).toBe(false);
    expect(oldKey.revokedAt).not.toBeNull();

    // Credential signed under the old key still verifies against the old key's
    // public key — verification binds to the historical key, not the active one.
    expect(
      verifyEd25519(
        oldSigned.publicPayload,
        oldSigned.signature,
        oldKey.publicKey,
      ),
    ).toBe(true);
    // ...and NOT against the new key.
    expect(
      verifyEd25519(
        oldSigned.publicPayload,
        oldSigned.signature,
        newKey.publicKey,
      ),
    ).toBe(false);

    // New credentials are signed with the new key.
    const newSigned = await svc.signCredential(payloadInput);
    expect(newSigned.signingKeyId).toBe(newKey.keyId);
  });

  it('records a SIGNING_KEY_ROTATED audit event naming the retired key', async () => {
    const store = new FakeKeyStore();
    const logged: AuditEventInput[] = [];
    const svc = makeService(store, (event) => logged.push(event));

    const first = await svc.getOrCreateActiveKey('issuer_1');
    const { created } = await svc.rotateActiveKey('issuer_1', {
      actorAdminId: 'admin_1',
      actorUsername: 'owner',
    });

    expect(logged.map((event) => event.action)).toEqual([
      'SIGNING_KEY_GENERATED',
      'SIGNING_KEY_ROTATED',
    ]);
    const rotation = logged[1];
    expect(rotation.targetId).toBe(created.keyId);
    expect(rotation.metadata?.retiredKeyIds).toEqual([first.keyId]);
    expect(rotation.context.actorAdminId).toBe('admin_1');
  });

  it('rolls the whole rotation back when the audit write fails (fail-closed)', async () => {
    const store = new FakeKeyStore();
    const svc = makeService(store, (event) => {
      if (event.action === 'SIGNING_KEY_ROTATED') {
        throw new Error('audit chain unavailable');
      }
    });

    const original = await svc.getOrCreateActiveKey('issuer_1');

    await expect(
      svc.rotateActiveKey('issuer_1', {
        actorAdminId: 'admin_1',
        actorUsername: 'owner',
      }),
    ).rejects.toThrow('audit chain unavailable');

    // Nothing committed: no new key, and the original is still the active one.
    // A rotation that succeeded without its audit entry would be undetectable
    // later (a missing entry keeps the hash chain contiguous), so it must not
    // be allowed to happen at all.
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0].keyId).toBe(original.keyId);
    expect(store.rows[0].active).toBe(true);
    expect(store.rows[0].revokedAt).toBeNull();

    // The issuer can still sign — the failed rotation left signing intact.
    const signed = await svc.signCredential(payloadInput);
    expect(signed.signingKeyId).toBe(original.keyId);
  });
});
