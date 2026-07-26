import { GoneException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { VerificationService } from './verification.service';

/**
 * Regression tests for FIX.md bug 1.1: `getCredentialVc` used to rebuild the VC
 * document from the live `issuer` row. Because the Data Integrity proof is
 * computed over the document, rebuilding it after an admin edited the
 * institution's display name or domain produced a document that no longer
 * matched its own signature — every VC issued before the edit began failing
 * verification, with nothing in the logs to say why.
 *
 * The fix is to serve the stored `vcDocument` snapshot and nothing else. The
 * first test below is the one that fails against the old behaviour: it makes the
 * snapshot disagree with the live row on purpose, and asserts the snapshot wins.
 */

type CredentialRow = {
  vcDocument: unknown;
  revoked: boolean;
  deletedAt: Date | null;
};

function serviceFor(row: CredentialRow | null) {
  const findFirst = jest.fn().mockResolvedValue(row);
  const prisma = { credential: { findFirst } };

  const service = new VerificationService(
    prisma as unknown as PrismaService,
    null as never,
    null as never,
    null as never,
  );

  return { service, findFirst };
}

const SNAPSHOT = {
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  type: ['VerifiableCredential', 'OpenBadgeCredential'],
  issuer: {
    id: 'did:web:old-domain.ac.id',
    name: 'Universitas Contoh (nama lama)',
  },
  credentialSubject: { achievement: { name: 'Sarjana Teknik Informatika' } },
  proof: {
    type: 'DataIntegrityProof',
    cryptosuite: 'eddsa-jcs-2022',
    proofValue: 'z3MvGcVxzRzzpKF1YPdHcp1uK6mYQpVvXjNsxHfLBLQ8h',
  },
};

describe('getCredentialVc — serves the stored snapshot, never a rebuild', () => {
  it('returns the snapshot verbatim, including an issuer name the live row no longer has', async () => {
    const { service } = serviceFor({
      vcDocument: SNAPSHOT,
      revoked: false,
      deletedAt: null,
    });

    const result = await service.getCredentialVc('crd_1');

    // A rebuild would put the current institution name and domain here. Byte
    // equality with the snapshot is what proves no rebuild happened.
    expect(result).toEqual(SNAPSHOT);
    expect(result).toMatchObject({
      issuer: {
        id: 'did:web:old-domain.ac.id',
        name: 'Universitas Contoh (nama lama)',
      },
    });
  });

  it('keeps the proof block that was signed alongside the document', async () => {
    const { service } = serviceFor({
      vcDocument: SNAPSHOT,
      revoked: false,
      deletedAt: null,
    });

    const result = (await service.getCredentialVc('crd_1')) as typeof SNAPSHOT;

    expect(result.proof.proofValue).toBe(SNAPSHOT.proof.proofValue);
    expect(result.proof.cryptosuite).toBe('eddsa-jcs-2022');
  });

  it('only reads the snapshot, revocation and deletion columns', async () => {
    // If a future edit adds `issuer: true` back to this select, that is the
    // rebuild bug creeping back in.
    const { service, findFirst } = serviceFor({
      vcDocument: SNAPSHOT,
      revoked: false,
      deletedAt: null,
    });

    await service.getCredentialVc('crd_1');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { vcDocument: true, revoked: true, deletedAt: true },
      }),
    );
  });

  it('looks the credential up by external id or primary key', async () => {
    const { service, findFirst } = serviceFor({
      vcDocument: SNAPSHOT,
      revoked: false,
      deletedAt: null,
    });

    await service.getCredentialVc('crd_1');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ credentialExternalId: 'crd_1' }, { id: 'crd_1' }],
        },
      }),
    );
  });
});

describe('getCredentialVc — refuses rather than improvising a document', () => {
  it('404s a credential that has no snapshot instead of rebuilding one', async () => {
    // This is the branch the old code filled in by rebuilding. Refusing is
    // correct: an unsigned document is worse than no document.
    const { service } = serviceFor({
      vcDocument: null,
      revoked: false,
      deletedAt: null,
    });

    await expect(service.getCredentialVc('crd_1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('404s an unknown credential', async () => {
    const { service } = serviceFor(null);

    await expect(service.getCredentialVc('crd_missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('410s a revoked credential without returning the document', async () => {
    const { service } = serviceFor({
      vcDocument: SNAPSHOT,
      revoked: true,
      deletedAt: null,
    });

    await expect(service.getCredentialVc('crd_1')).rejects.toThrow(
      GoneException,
    );
  });

  it('410s a soft-deleted credential without returning the document', async () => {
    const { service } = serviceFor({
      vcDocument: SNAPSHOT,
      revoked: false,
      deletedAt: new Date('2025-07-01T00:00:00.000Z'),
    });

    await expect(service.getCredentialVc('crd_1')).rejects.toThrow(
      GoneException,
    );
  });

  it('404s before 410 when a revoked credential also has no snapshot', async () => {
    // Both are refusals, so the order only matters for the message a verifier
    // reads. Locking it in keeps the two branches from being reordered blindly.
    const { service } = serviceFor({
      vcDocument: null,
      revoked: true,
      deletedAt: null,
    });

    await expect(service.getCredentialVc('crd_1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
