import { IssuerSigningKey } from '@prisma/client';

import { AuditLogService } from '../../modules/audit/audit-log.service';
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
  };
}

describe('SigningKeyService key rotation', () => {
  const config = {
    signingKeyEncryptionSecret: 'unit-test-master-secret-at-least-32-chars',
  } as AppConfigService;
  const auditLog = {
    log: () => Promise.resolve(),
  } as unknown as AuditLogService;

  function makeService(store: FakeKeyStore) {
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

    // Rotate: retire the old key, activate a fresh one.
    oldKey.active = false;
    oldKey.revokedAt = new Date('2021-01-01T00:00:00Z');
    const newKey = await svc.getOrCreateActiveKey('issuer_1');

    expect(newKey.id).not.toBe(oldKey.id);
    expect(store.rows).toHaveLength(2); // history preserved
    expect(store.rows[0].revokedAt).not.toBeNull();

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
  });
});
