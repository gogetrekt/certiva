import {
  computeEntryHash,
  verifyAuditChainRows,
  type ChainRow,
} from './audit-log.service';

function makeRow(
  seq: number,
  prevHash: string | null,
  overrides: Partial<ChainRow> = {},
): ChainRow {
  const row: ChainRow = {
    seq,
    action: 'CREDENTIAL_ISSUED',
    actorAdminId: 'admin-1',
    actorUsername: 'alice',
    targetType: 'Credential',
    targetId: `cred-${seq}`,
    metadata: { credentialExternalId: `EXT-${seq}` },
    ipAddress: '10.0.0.1',
    userAgent: 'jest',
    createdAt: new Date(`2026-07-19T00:00:0${seq}.000Z`),
    prevHash,
    entryHash: null,
    ...overrides,
  };
  row.entryHash = computeEntryHash(row);
  return row;
}

describe('audit hash chain', () => {
  it('accepts an untampered chain', () => {
    const r1 = makeRow(1, null);
    const r2 = makeRow(2, r1.entryHash);
    const r3 = makeRow(3, r2.entryHash);
    expect(verifyAuditChainRows([r1, r2, r3]).valid).toBe(true);
  });

  it('detects an altered row', () => {
    const r1 = makeRow(1, null);
    const r2 = makeRow(2, r1.entryHash);
    const r3 = makeRow(3, r2.entryHash);
    // Tamper with the content after its entryHash was sealed.
    r2.metadata = { credentialExternalId: 'HACKED' };
    const v = verifyAuditChainRows([r1, r2, r3]);
    expect(v.valid).toBe(false);
    expect(v.brokenAtSeq).toBe(2);
  });

  it('detects a deleted row via the broken prevHash link', () => {
    const r1 = makeRow(1, null);
    const r2 = makeRow(2, r1.entryHash);
    const r3 = makeRow(3, r2.entryHash);
    const v = verifyAuditChainRows([r1, r3]); // r2 removed
    expect(v.valid).toBe(false);
    expect(v.brokenAtSeq).toBe(3);
  });
});
