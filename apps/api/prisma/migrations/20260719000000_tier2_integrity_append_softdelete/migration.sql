-- 2.1 Append-only blockchain anchor log: undo the singleton unique constraint
-- so every lifecycle event is retained as its own immutable row.
DROP INDEX IF EXISTS "BlockchainAnchorLog_credentialId_key";
CREATE INDEX IF NOT EXISTS "BlockchainAnchorLog_credentialId_createdAt_idx"
  ON "BlockchainAnchorLog"("credentialId", "createdAt");

-- 2.2 Tamper-evident audit log: monotonic seq + hash chain (prevHash -> entryHash).
-- SERIAL backfills existing rows with sequential seq values; entryHash stays NULL
-- for legacy (pre-chain) rows and is populated for every new row going forward.
ALTER TABLE "AuditLog"
  ADD COLUMN "seq" SERIAL NOT NULL,
  ADD COLUMN "prevHash" TEXT,
  ADD COLUMN "entryHash" TEXT;
CREATE UNIQUE INDEX "AuditLog_seq_key" ON "AuditLog"("seq");
CREATE UNIQUE INDEX "AuditLog_entryHash_key" ON "AuditLog"("entryHash");

-- 2.3 Soft-delete credentials: retain the row + logs as evidence, never hard-delete.
ALTER TABLE "Credential"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT,
  ADD COLUMN "deletedByAdminId" TEXT;
CREATE INDEX "Credential_deletedAt_idx" ON "Credential"("deletedAt");
