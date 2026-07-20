import { IssuerSigningKey } from '@prisma/client';

import { AppConfigService } from '../../config/app-config.service';
import { AuditLogService } from '../audit/audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptedSigningKeyProvider } from '../../common/signing/encrypted-signing-key.provider';
import { SigningKeyService } from '../../common/signing/signing-key.service';
import { verifyEd25519 } from '../../common/signing/signing-crypto.util';
import { buildSignatureBlock } from './verification.service';

const config = {
  signingKeyEncryptionSecret: 'unit-test-master-secret-at-least-32-chars',
} as AppConfigService;

// Minimal in-memory key store (see signing-key.service.spec for the pattern).
class FakeKeyStore {
  rows: IssuerSigningKey[] = [];
  private seq = 0;
  issuerSigningKey = {
    findFirst: (args: {
      where: { issuerId: string };
    }): Promise<IssuerSigningKey | null> =>
      Promise.resolve(
        this.rows.find(
          (r) =>
            r.issuerId === args.where.issuerId &&
            r.active &&
            r.revokedAt === null,
        ) ?? null,
      ),
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

async function signSampleCredential() {
  const store = new FakeKeyStore();
  const svc = new SigningKeyService(
    store as unknown as PrismaService,
    new EncryptedSigningKeyProvider(config),
    { log: () => Promise.resolve() } as unknown as AuditLogService,
  );
  const signed = await svc.signCredential({
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
  });
  return { signed, key: store.rows[0] };
}

describe('buildSignatureBlock (verify() backward compatibility)', () => {
  it('returns null for a pre-Fase-0 credential (no signature) — no error', () => {
    expect(
      buildSignatureBlock({
        signature: null,
        publicPayload: null,
        signatureAlgorithm: null,
        signingKey: null,
      }),
    ).toBeNull();
  });

  it('returns a valid verdict for an untampered signed credential', async () => {
    const { signed, key } = await signSampleCredential();
    const block = buildSignatureBlock({
      signature: signed.signature,
      publicPayload: signed.publicPayload,
      signatureAlgorithm: 'Ed25519',
      signingKey: { keyId: key.keyId, publicKey: key.publicKey },
    });
    expect(block).not.toBeNull();
    expect(block!.signatureValid).toBe(true);
    expect(block!.publicKey).toBe(key.publicKey);
  });

  it('flags an invalid verdict if the stored payload was tampered', async () => {
    const { signed, key } = await signSampleCredential();
    const block = buildSignatureBlock({
      signature: signed.signature,
      publicPayload: signed.publicPayload.replace('2020', '2099'),
      signatureAlgorithm: 'Ed25519',
      signingKey: { keyId: key.keyId, publicKey: key.publicKey },
    });
    expect(block!.signatureValid).toBe(false);
  });

  it('flags an invalid verdict when the student name is altered', async () => {
    const { signed, key } = await signSampleCredential();
    const block = buildSignatureBlock({
      signature: signed.signature,
      publicPayload: signed.publicPayload.replace('Ada Lovelace', 'Bob Forger'),
      signatureAlgorithm: 'Ed25519',
      signingKey: { keyId: key.keyId, publicKey: key.publicKey },
    });
    expect(block!.signatureValid).toBe(false);
  });

  it('flags an invalid verdict when the degree is altered', async () => {
    const { signed, key } = await signSampleCredential();
    const block = buildSignatureBlock({
      signature: signed.signature,
      publicPayload: signed.publicPayload.replace('S.Kom', 'Ph.D'),
      signatureAlgorithm: 'Ed25519',
      signingKey: { keyId: key.keyId, publicKey: key.publicKey },
    });
    expect(block!.signatureValid).toBe(false);
  });
});

describe('/proof bundle is verifiable by a third party without DB access', () => {
  it('reverifies using only the fields the proof endpoint returns', async () => {
    const { signed, key } = await signSampleCredential();
    // Shape mirrors getCredentialProof()'s response — no DB, no server.
    const proof = {
      publicPayload: signed.publicPayload,
      signature: signed.signature,
      issuer: { publicKey: key.publicKey },
    };
    expect(
      verifyEd25519(
        proof.publicPayload,
        proof.signature,
        proof.issuer.publicKey,
      ),
    ).toBe(true);
  });

  it('never leaks private key material in the signing result', async () => {
    const { signed, key } = await signSampleCredential();
    // The value the API hands out must not contain the encrypted private blob.
    const serialized = JSON.stringify(signed);
    expect(serialized).not.toContain(key.privateKeyEncrypted);
    expect(serialized).not.toContain('privateKey');
  });
});
