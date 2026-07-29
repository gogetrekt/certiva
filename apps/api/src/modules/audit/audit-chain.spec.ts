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

/**
 * Row-to-row continuity only ever proved that the rows *shown to it* follow one
 * another. Everything below used to return `valid: true`, which is exactly the
 * set of cases an insider covering their tracks would produce: delete the last
 * N entries, or empty the table outright.
 */
describe('audit hash chain — removal from the end', () => {
  const chainOf = (n: number) => {
    const rows: ChainRow[] = [];
    for (let seq = 1; seq <= n; seq += 1) {
      rows.push(makeRow(seq, rows[rows.length - 1]?.entryHash ?? null));
    }
    return rows;
  };

  const headOf = (rows: ChainRow[]) => {
    const last = rows[rows.length - 1];
    return { seq: last.seq, entryHash: last.entryHash as string };
  };

  it('accepts the full chain against its own head', () => {
    const rows = chainOf(4);
    const v = verifyAuditChainRows(rows, headOf(rows));
    expect(v.valid).toBe(true);
    expect(v.checked).toBe(4);
  });

  it('rejects a chain truncated at the tail', () => {
    const rows = chainOf(4);
    const head = headOf(rows);
    const v = verifyAuditChainRows(rows.slice(0, 2), head);
    expect(v.valid).toBe(false);
    expect(v.reason).toContain('removed from the end');
  });

  it('rejects an emptied table', () => {
    const head = headOf(chainOf(4));
    const v = verifyAuditChainRows([], head);
    expect(v.valid).toBe(false);
    expect(v.checked).toBe(0);
    expect(v.reason).toContain('empty');
  });

  it('rejects a hole in seq even when prevHash still lines up', () => {
    const rows = chainOf(4);
    // Row 3 is gone and row 4 is renumbered, so the hash links still agree —
    // only the seq numbering gives it away.
    const surviving = [rows[0], rows[1], rows[3]];
    const v = verifyAuditChainRows(surviving, headOf(rows));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain('seq gap');
    expect(v.brokenAtSeq).toBe(4);
  });

  it('still passes an empty table when nothing was ever written', () => {
    expect(verifyAuditChainRows([], null).valid).toBe(true);
  });
});

/**
 * `verifyChain` used to query with `where: { entryHash: { not: null } }`, so
 * rows without a hash were dropped before verification began and the verdict
 * never mentioned them. On the development database that silently excluded 16
 * of 62 rows. Anyone able to run `UPDATE "AuditLog" SET "entryHash" = NULL`
 * could lift a row out of scope and keep the answer green.
 */
describe('audit hash chain — rows the chain does not vouch for', () => {
  it('counts unchained rows instead of discarding them', () => {
    const r1 = makeRow(1, null);
    const r2 = makeRow(2, r1.entryHash);
    const orphan = { ...makeRow(3, r2.entryHash), entryHash: null };

    const v = verifyAuditChainRows([r1, r2, orphan]);

    expect(v.totalRows).toBe(3);
    expect(v.unchained).toBe(1);
    expect(v.checked).toBe(2);
  });

  it('does not read an unchained row as a missing one', () => {
    const r1 = makeRow(1, null);
    const orphan = { ...makeRow(2, r1.entryHash), entryHash: null };
    const r3 = makeRow(3, r1.entryHash);

    // seq 1,2,3 is contiguous: the middle row is present, just unhashed.
    expect(verifyAuditChainRows([r1, orphan, r3]).valid).toBe(true);
  });
});
