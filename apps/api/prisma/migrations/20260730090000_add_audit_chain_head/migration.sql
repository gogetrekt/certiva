-- The chain head, stored outside AuditLog so that deleting rows from the tail
-- of that table is detectable. Row-to-row verification cannot see a tail
-- truncation: what remains is a shorter chain that is still perfectly
-- continuous, and an emptied table passes vacuously.
CREATE TABLE "AuditChainHead" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "seq" INTEGER NOT NULL,
    "entryHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditChainHead_pkey" PRIMARY KEY ("id")
);

-- Seed the head from the current last chained row. Without this the anchor
-- would only start protecting the log after the next audit event is written,
-- leaving everything already in the table unanchored until then.
--
-- This establishes the head as of the cut-over. It does not retroactively
-- prove that nothing was removed before now.
INSERT INTO "AuditChainHead" ("id", "seq", "entryHash", "updatedAt")
SELECT 'singleton', "seq", "entryHash", NOW()
FROM "AuditLog"
WHERE "entryHash" IS NOT NULL
ORDER BY "seq" DESC
LIMIT 1;
