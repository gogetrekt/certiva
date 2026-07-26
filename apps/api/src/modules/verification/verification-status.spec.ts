import { IssuerStatus } from '@prisma/client';

import { BLOCKCHAIN_PROOF_STATUS } from '../blockchain/blockchain.constants';
import { VerificationService } from './verification.service';

/**
 * `resolveStatus` decides the single word a verifier sees. Every test here is a
 * negative case, because the failure that matters is reporting VALID for
 * something that is not: a suite that only checks the happy path passes against
 * a function that has been reduced to `return 'VALID'`.
 *
 * Precedence is as load-bearing as the individual branches. A revoked credential
 * whose stored record was also altered must not report REVOKED-but-intact, and an
 * inactive issuer must win over everything, so the ordering is asserted directly
 * rather than left implicit in single-condition tests.
 */

type BlockchainVerification = Parameters<
  VerificationService['resolveStatus']
>[1];

// resolveStatus reads only issuer.status and revoked; it never touches the
// injected services, so the service is constructed with nulls on purpose. If a
// future change makes it depend on a collaborator, these tests fail loudly with
// a TypeError rather than silently testing a stub.
const service = new VerificationService(
  null as never,
  null as never,
  null as never,
  null as never,
);

function resolve(
  credential: { issuerStatus?: IssuerStatus; revoked?: boolean },
  chain: BlockchainVerification = null,
  signatureValid?: boolean | null,
) {
  return service['resolveStatus'](
    {
      revoked: credential.revoked ?? false,
      issuer: { status: credential.issuerStatus ?? IssuerStatus.ACTIVE },
    } as never,
    chain,
    signatureValid,
  );
}

function chainWith(
  over: {
    blockchainStatus?: string;
    revoked?: boolean;
  } = {},
): BlockchainVerification {
  return {
    blockchainStatus: over.blockchainStatus ?? BLOCKCHAIN_PROOF_STATUS.pending,
    proof: { revoked: over.revoked ?? false },
  } as unknown as BlockchainVerification;
}

describe('resolveStatus — an inactive issuer invalidates everything it signed', () => {
  it.each([[IssuerStatus.INACTIVE], [IssuerStatus.SUSPENDED]])(
    'returns INVALID when the issuer is %s',
    (issuerStatus) => {
      expect(resolve({ issuerStatus }, chainWith(), true)).toBe('INVALID');
    },
  );

  it('returns INVALID for a suspended issuer even when everything else checks out', () => {
    expect(
      resolve(
        { issuerStatus: IssuerStatus.SUSPENDED, revoked: false },
        chainWith({
          blockchainStatus: BLOCKCHAIN_PROOF_STATUS.onChainVerified,
        }),
        true,
      ),
    ).toBe('INVALID');
  });

  it('outranks a chain mismatch, a revocation, and a bad signature', () => {
    // Whichever other problem also applies, the issuer verdict is the one
    // reported — an unauthorised issuer is the more fundamental failure.
    expect(
      resolve(
        { issuerStatus: IssuerStatus.SUSPENDED, revoked: true },
        chainWith({
          blockchainStatus: BLOCKCHAIN_PROOF_STATUS.mismatch,
          revoked: true,
        }),
        false,
      ),
    ).toBe('INVALID');
  });
});

describe('resolveStatus — a chain mismatch is tampering', () => {
  it('returns TAMPERED when the on-chain hash does not match', () => {
    expect(
      resolve(
        {},
        chainWith({ blockchainStatus: BLOCKCHAIN_PROOF_STATUS.mismatch }),
      ),
    ).toBe('TAMPERED');
  });

  it('reports TAMPERED rather than REVOKED when the record is both', () => {
    // Reporting REVOKED here would tell the verifier the record is authentic and
    // merely withdrawn, which is a weaker and misleading claim.
    expect(
      resolve(
        { revoked: true },
        chainWith({
          blockchainStatus: BLOCKCHAIN_PROOF_STATUS.mismatch,
          revoked: true,
        }),
        false,
      ),
    ).toBe('TAMPERED');
  });

  it.each([
    [BLOCKCHAIN_PROOF_STATUS.notAnchored],
    [BLOCKCHAIN_PROOF_STATUS.pending],
    [BLOCKCHAIN_PROOF_STATUS.unavailable],
    [BLOCKCHAIN_PROOF_STATUS.failed],
    [BLOCKCHAIN_PROOF_STATUS.archivedV1],
  ])('does not read %s as tampering', (blockchainStatus) => {
    // These mean "the chain could not confirm", not "the data disagrees". Reading
    // an unreachable RPC as tampering would fail every verification during an
    // outage.
    expect(resolve({}, chainWith({ blockchainStatus }), true)).toBe('VALID');
  });
});

describe('resolveStatus — revocation is reported from either source', () => {
  it('returns REVOKED when only the database row is revoked', () => {
    expect(resolve({ revoked: true }, chainWith(), true)).toBe('REVOKED');
  });

  it('returns REVOKED when only the on-chain proof is revoked', () => {
    // The chain is authoritative even if the local row was never updated, so a
    // failed revocation write cannot resurrect a revoked credential.
    expect(
      resolve({ revoked: false }, chainWith({ revoked: true }), true),
    ).toBe('REVOKED');
  });

  it('returns REVOKED with no chain data at all', () => {
    expect(resolve({ revoked: true }, null, true)).toBe('REVOKED');
  });

  it('outranks a failed signature check', () => {
    expect(resolve({ revoked: true }, chainWith(), false)).toBe('REVOKED');
  });
});

describe('resolveStatus — a signature that does not recompute fails closed', () => {
  it('returns TAMPERED when the signature is present but invalid', () => {
    expect(resolve({}, chainWith(), false)).toBe('TAMPERED');
  });

  it('returns TAMPERED even when the chain reports on-chain verified', () => {
    // The anchor covers the document hash; the signature covers the stored
    // fields. A valid anchor does not excuse altered fields.
    expect(
      resolve(
        {},
        chainWith({
          blockchainStatus: BLOCKCHAIN_PROOF_STATUS.onChainVerified,
        }),
        false,
      ),
    ).toBe('TAMPERED');
  });

  it('treats an unsigned pre-Fase-0 credential as VALID, not as tampering', () => {
    // null means "never signed", which is a supported legacy state. Conflating
    // it with false would mark every historical credential as tampered.
    expect(resolve({}, chainWith(), null)).toBe('VALID');
  });

  it('treats an omitted signature verdict as VALID', () => {
    expect(resolve({}, chainWith(), undefined)).toBe('VALID');
  });

  it('distinguishes false from null and from undefined', () => {
    expect(resolve({}, chainWith(), false)).toBe('TAMPERED');
    expect(resolve({}, chainWith(), null)).toBe('VALID');
    expect(resolve({}, chainWith(), undefined)).toBe('VALID');
  });
});

describe('resolveStatus — VALID is only reached when nothing is wrong', () => {
  it('returns VALID for an active issuer, unrevoked record, and good signature', () => {
    expect(
      resolve(
        { issuerStatus: IssuerStatus.ACTIVE, revoked: false },
        chainWith({
          blockchainStatus: BLOCKCHAIN_PROOF_STATUS.onChainVerified,
        }),
        true,
      ),
    ).toBe('VALID');
  });

  it('returns VALID when the chain is simply unreachable', () => {
    expect(resolve({}, null, true)).toBe('VALID');
  });

  // Enumerating the ways VALID must not be reached keeps the branch table honest
  // if a new status is added later.
  it.each([
    [
      'inactive issuer',
      { issuerStatus: IssuerStatus.INACTIVE },
      chainWith(),
      true,
      'INVALID',
    ],
    ['revoked row', { revoked: true }, chainWith(), true, 'REVOKED'],
    ['revoked on chain', {}, chainWith({ revoked: true }), true, 'REVOKED'],
    [
      'hash mismatch',
      {},
      chainWith({ blockchainStatus: BLOCKCHAIN_PROOF_STATUS.mismatch }),
      true,
      'TAMPERED',
    ],
    ['bad signature', {}, chainWith(), false, 'TAMPERED'],
  ] as const)('never returns VALID for %s', (_, cred, chain, sig, expected) => {
    const status = resolve(cred, chain, sig);
    expect(status).toBe(expected);
    expect(status).not.toBe('VALID');
  });
});
