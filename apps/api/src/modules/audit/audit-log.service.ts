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

export interface ChainVerdict {
  valid: boolean;
  checked: number;
  brokenAtSeq: number | null;
  reason: string | null;
}

// Pure re-computation of the chain over ordered rows — no DB, so it is directly
// unit-testable. Rows must be ordered by seq ascending.
export function verifyAuditChainRows(rows: ChainRow[]): ChainVerdict {
  let prevHash: string | null = null;
  for (const row of rows) {
    if (row.prevHash !== prevHash) {
      return {
        valid: false,
        checked: rows.length,
        brokenAtSeq: row.seq,
        reason:
          'prevHash does not match the previous entry (missing or reordered row)',
      };
    }
    if (computeEntryHash(row) !== row.entryHash) {
      return {
        valid: false,
        checked: rows.length,
        brokenAtSeq: row.seq,
        reason: 'entryHash mismatch (row content was altered)',
      };
    }
    prevHash = row.entryHash;
  }
  return { valid: true, checked: rows.length, brokenAtSeq: null, reason: null };
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

    await tx.auditLog.create({
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
   * Recompute the hash chain over all chained rows (entryHash not null) and
   * report the first break, if any. A broken chain means a row was edited,
   * deleted, or reordered after the fact. (2.2)
   */
  async verifyChain(): Promise<ChainVerdict> {
    const rows = await this.prisma.auditLog.findMany({
      where: { entryHash: { not: null } },
      orderBy: { seq: 'asc' },
    });
    return verifyAuditChainRows(rows);
  }
}
