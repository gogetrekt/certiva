import { createHash } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface AuditContext {
  actorAdminId?: string;
  actorUsername?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditEventInput {
  action: AuditAction;
  context: AuditContext;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

// Arbitrary constant key so all audit writers serialize on the same advisory
// lock — guarantees a consistent prevHash even under concurrent writes.
const AUDIT_CHAIN_LOCK = 728911;

// Deterministic JSON so the hash is stable regardless of key insertion order
// (Prisma may return JSON columns with different key ordering on read-back).
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys
    .map(
      (k) =>
        `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`,
    )
    .join(',')}}`;
}

interface HashableEntry {
  action: string;
  actorAdminId: string | null;
  actorUsername: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  prevHash: string | null;
}

export interface ChainRow extends HashableEntry {
  seq: number;
  entryHash: string | null;
}

/** The AuditChainHead table holds exactly one row, under this id. */
export const CHAIN_HEAD_ID = 'singleton';

/** The separately stored anchor the last row of the table must match. */
export interface ChainHead {
  seq: number;
  entryHash: string;
}

export interface ChainVerdict {
  valid: boolean;
  /** Rows whose hash was actually recomputed. */
  checked: number;
  /** Rows present in the table, chained or not. */
  totalRows: number;
  /** Rows with a NULL entryHash — present, but vouched for by nothing. */
  unchained: number;
  brokenAtSeq: number | null;
  reason: string | null;
}

/**
 * Pure re-computation of the chain over ordered rows — no DB, so it is directly
 * unit-testable. Rows must be ordered by seq ascending, and must be **every**
 * row of the table, including the ones with a NULL entryHash: their seq numbers
 * are what distinguishes an unchained row from a deleted one.
 *
 * Row-to-row continuity alone answers a much narrower question than it appears
 * to. It detects an edit or a deletion in the *middle*, because the following
 * row's prevHash stops matching. It does not detect:
 *
 *   - deleting rows from the **tail**, which leaves a shorter but perfectly
 *     continuous chain — the "delete the record of my last N actions" case;
 *   - `TRUNCATE`, which leaves nothing to disagree with anything;
 *   - a row lifted out of scope with `SET entryHash = NULL`.
 *
 * The three additional checks below close those, and each needs the one before
 * it: seq continuity catches holes, the head catches tail truncation, and the
 * head's existence is what makes an empty table a failure rather than a vacuous
 * pass.
 */
export function verifyAuditChainRows(
  rows: ChainRow[],
  head?: ChainHead | null,
): ChainVerdict {
  const chained = rows.filter((row) => row.entryHash !== null);
  const base = {
    checked: chained.length,
    totalRows: rows.length,
    unchained: rows.length - chained.length,
  };
  const fail = (brokenAtSeq: number | null, reason: string): ChainVerdict => ({
    valid: false,
    ...base,
    brokenAtSeq,
    reason,
  });

  // An empty table is only trustworthy if nothing was ever written. A stored
  // head is the proof that something was.
  if (rows.length === 0) {
    return head
      ? fail(
          head.seq,
          `audit log is empty but the stored chain head is at seq ${head.seq} (table was cleared)`,
        )
      : { valid: true, ...base, brokenAtSeq: null, reason: null };
  }

  // seq is a Postgres autoincrement, so a hole means a row that existed is no
  // longer there. A rolled-back transaction burns a seq value the same way, so
  // this is reported as a specific, nameable reason rather than folded into the
  // generic "chain broken" — an operator has to be able to tell the two apart.
  for (let i = 1; i < rows.length; i += 1) {
    const expected = rows[i - 1].seq + 1;
    if (rows[i].seq !== expected) {
      return fail(
        rows[i].seq,
        `seq gap: expected ${expected} after ${rows[i - 1].seq}, found ${rows[i].seq} (row deleted, or a transaction rolled back)`,
      );
    }
  }

  let prevHash: string | null = null;
  for (const row of chained) {
    if (row.prevHash !== prevHash) {
      return fail(
        row.seq,
        'prevHash does not match the previous entry (missing or reordered row)',
      );
    }
    if (computeEntryHash(row) !== row.entryHash) {
      return fail(row.seq, 'entryHash mismatch (row content was altered)');
    }
    prevHash = row.entryHash;
  }

  // The anchor. Without it, lopping rows off the end is invisible: everything
  // above this point still passes on the truncated remainder.
  if (head) {
    const last = chained[chained.length - 1];
    if (!last) {
      return fail(
        head.seq,
        `stored chain head is at seq ${head.seq} but no chained row remains`,
      );
    }
    if (last.seq !== head.seq || last.entryHash !== head.entryHash) {
      return fail(
        last.seq,
        `last row (seq ${last.seq}) does not match the stored chain head (seq ${head.seq}) — rows were removed from the end`,
      );
    }
  }

  return { valid: true, ...base, brokenAtSeq: null, reason: null };
}

export function computeEntryHash(entry: HashableEntry): string {
  const payload = [
    entry.prevHash ?? 'GENESIS',
    entry.action,
    entry.actorAdminId ?? '',
    entry.actorUsername ?? '',
    entry.targetType ?? '',
    entry.targetId ?? '',
    canonicalize(entry.metadata ?? null),
    entry.ipAddress ?? '',
    entry.userAgent ?? '',
    entry.createdAt.toISOString(),
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Take the chain-head advisory lock on an existing transaction.
   *
   * LOCK ORDER — DO NOT REORDER. A caller that writes its own rows *and* an
   * audit entry in one transaction must take this lock as its FIRST statement,
   * before touching any other row. Every audit writer then acquires locks in the
   * same order (audit chain lock → data rows); the reverse order in even one
   * path introduces a deadlock that only shows up under concurrency in
   * production. Re-taking the lock inside the same transaction is safe (Postgres
   * advisory locks are reference-counted per session), so callers that lock here
   * can still pass the same tx to `log()`.
   */
  async lockChain(tx: Prisma.TransactionClient): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_CHAIN_LOCK})`;
  }

  /**
   * Append one entry to the hash chain.
   *
   * Two failure postures, picked by whether `tx` is passed:
   *
   * - **No `tx` (default)**: the write gets its own transaction and failures are
   *   swallowed — an audit outage must never break the primary operation.
   * - **With `tx`**: the entry is written inside the caller's transaction and
   *   failures **propagate**, rolling the caller's work back with it. Use this
   *   for actions where a silently missing entry is unacceptable. A missing
   *   entry does not break the chain (prevHash→entryHash stays contiguous), so
   *   chain verification cannot detect the omission afterwards — fail-closed at
   *   write time is the only place it can be caught.
   */
  async log(
    input: AuditEventInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (tx) {
      // Deliberately outside the try/catch: the caller opted into fail-closed.
      await this.writeEntry(tx, input);
      return;
    }

    try {
      await this.prisma.$transaction((ownTx) => this.writeEntry(ownTx, input));
    } catch (error) {
      // ponytail: audit failure must never break the primary operation — but
      // that also means an omission here is silent and undetectable by chain
      // verification. Callers that cannot tolerate that pass a tx (see above);
      // the remaining non-tx call sites are tracked in docs/PLAN.md.
      this.logger.error(
        `Failed to write audit log for action ${input.action}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async writeEntry(
    tx: Prisma.TransactionClient,
    input: AuditEventInput,
  ): Promise<void> {
    const createdAt = new Date();
    const metadata =
      input.metadata !== undefined
        ? (input.metadata as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull;

    // Serialize the chain head so concurrent writers can't fork prevHash. No-op
    // when the caller already holds it (see lockChain).
    await this.lockChain(tx);

    const last = await tx.auditLog.findFirst({
      where: { entryHash: { not: null } },
      orderBy: { seq: 'desc' },
      select: { entryHash: true },
    });
    const prevHash = last?.entryHash ?? null;

    const entryHash = computeEntryHash({
      action: input.action,
      actorAdminId: input.context.actorAdminId ?? null,
      actorUsername: input.context.actorUsername ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: input.metadata ?? null,
      ipAddress: input.context.ipAddress ?? null,
      userAgent: input.context.userAgent ?? null,
      createdAt,
      prevHash,
    });

    const created = await tx.auditLog.create({
      data: {
        action: input.action,
        actorAdminId: input.context.actorAdminId ?? null,
        actorUsername: input.context.actorUsername ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata,
        ipAddress: input.context.ipAddress ?? null,
        userAgent: input.context.userAgent ?? null,
        prevHash,
        entryHash,
        createdAt,
      },
      select: { seq: true },
    });

    // Advance the head in the same transaction as the row it points at, and
    // under the same advisory lock, so the two can never disagree. This is the
    // anchor that makes a deletion from the tail of the table detectable.
    await tx.auditChainHead.upsert({
      where: { id: CHAIN_HEAD_ID },
      create: { id: CHAIN_HEAD_ID, seq: created.seq, entryHash },
      update: { seq: created.seq, entryHash },
    });
  }

  async listAuditLogs(options?: { limit?: number; offset?: number }) {
    const take = Math.min(options?.limit ?? 50, 200);
    const skip = options?.offset ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.auditLog.count(),
    ]);

    return { items, total };
  }

  /**
   * Recompute the hash chain and report the first break, if any.
   *
   * A break means a row was edited, deleted or reordered after the fact. The
   * verdict also carries `totalRows` and `unchained` so that a caller can see
   * how much of the table the `valid` flag actually speaks for: `valid: true`
   * with `unchained > 0` means "the chained part is intact", not "the audit log
   * is intact".
   */
  async verifyChain(): Promise<ChainVerdict> {
    // Every row, not just the chained ones. The old `where entryHash != null`
    // filter dropped rows before verification even started and then reported a
    // count that read as "the table is fine": an attacker able to run
    // `UPDATE "AuditLog" SET "entryHash" = NULL` could lift any row out of
    // scope and keep the verdict green. Unchained rows are now counted and
    // reported, and their seq numbers take part in the continuity check.
    const [rows, head] = await Promise.all([
      this.prisma.auditLog.findMany({ orderBy: { seq: 'asc' } }),
      this.prisma.auditChainHead.findUnique({ where: { id: CHAIN_HEAD_ID } }),
    ]);
    return verifyAuditChainRows(rows, head);
  }
}
