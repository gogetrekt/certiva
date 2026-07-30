WITH ranked_logs AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "credentialId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "BlockchainAnchorLog"
)
DELETE FROM "BlockchainAnchorLog"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_logs
  WHERE row_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlockchainAnchorLog_credentialId_key"
ON "BlockchainAnchorLog"("credentialId");
