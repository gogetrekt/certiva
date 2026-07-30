DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IssuanceBatchSourceType') THEN
    CREATE TYPE "IssuanceBatchSourceType" AS ENUM ('CSV', 'API');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CredentialDocumentProofSourceType') THEN
    CREATE TYPE "CredentialDocumentProofSourceType" AS ENUM ('SINGLE_PDF', 'BATCH_ZIP');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CredentialDocumentProofStatus') THEN
    CREATE TYPE "CredentialDocumentProofStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'REVOKED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerificationEventType') THEN
    CREATE TYPE "VerificationEventType" AS ENUM ('REGISTRY_CODE_LOOKUP', 'QR_LOOKUP', 'PDF_INTEGRITY_CHECK');
  END IF;
END $$;

ALTER TABLE "Credential"
  ADD COLUMN IF NOT EXISTS "credentialExternalId" TEXT,
  ADD COLUMN IF NOT EXISTS "qrPayload" TEXT,
  ADD COLUMN IF NOT EXISTS "registryHash" TEXT,
  ADD COLUMN IF NOT EXISTS "graduationYear" INTEGER,
  ADD COLUMN IF NOT EXISTS "batchId" TEXT;

UPDATE "Credential"
SET
  "credentialExternalId" = COALESCE("credentialExternalId", "id"),
  "qrPayload" = COALESCE("qrPayload", "verificationUrl"),
  "registryHash" = COALESCE("registryHash", "hash")
WHERE
  "credentialExternalId" IS NULL
  OR "qrPayload" IS NULL
  OR "registryHash" IS NULL;

ALTER TABLE "Credential"
  ALTER COLUMN "credentialExternalId" SET NOT NULL,
  ALTER COLUMN "qrPayload" SET NOT NULL,
  ALTER COLUMN "registryHash" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "IssuanceBatch" (
  "id" TEXT NOT NULL,
  "issuerId" TEXT NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "sourceType" "IssuanceBatchSourceType" NOT NULL DEFAULT 'CSV',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "issuedRows" INTEGER NOT NULL DEFAULT 0,
  "failedRows" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "anchoredAt" TIMESTAMP(3),
  "txHash" TEXT,
  CONSTRAINT "IssuanceBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CredentialDocumentProof" (
  "id" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "algorithm" TEXT NOT NULL DEFAULT 'SHA-256',
  "fileName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "registeredBy" TEXT NOT NULL,
  "sourceType" "CredentialDocumentProofSourceType" NOT NULL,
  "status" "CredentialDocumentProofStatus" NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "CredentialDocumentProof_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VerificationLog"
  ADD COLUMN IF NOT EXISTS "eventType" "VerificationEventType" NOT NULL DEFAULT 'REGISTRY_CODE_LOOKUP';

INSERT INTO "CredentialDocumentProof" (
  "id",
  "credentialId",
  "hash",
  "fileName",
  "fileSize",
  "mimeType",
  "registeredAt",
  "registeredBy",
  "sourceType",
  "status"
)
SELECT
  'cdp_' || md5("id" || ':' || "documentHash"),
  "id",
  "documentHash",
  COALESCE("fileName", 'credential-' || "verificationId" || '.pdf'),
  COALESCE("fileSize", 0),
  COALESCE("mimeType", 'application/pdf'),
  COALESCE("issuedAt", CURRENT_TIMESTAMP),
  'migration-repair',
  'SINGLE_PDF'::"CredentialDocumentProofSourceType",
  'ACTIVE'::"CredentialDocumentProofStatus"
FROM "Credential"
WHERE "documentHash" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "CredentialDocumentProof" proof
    WHERE proof."credentialId" = "Credential"."id"
      AND proof."hash" = "Credential"."documentHash"
  );

CREATE UNIQUE INDEX IF NOT EXISTS "Credential_credentialExternalId_key" ON "Credential"("credentialExternalId");
CREATE UNIQUE INDEX IF NOT EXISTS "Credential_registryHash_key" ON "Credential"("registryHash");
CREATE INDEX IF NOT EXISTS "Credential_credentialExternalId_idx" ON "Credential"("credentialExternalId");
CREATE INDEX IF NOT EXISTS "Credential_registryHash_idx" ON "Credential"("registryHash");
CREATE INDEX IF NOT EXISTS "Credential_batchId_idx" ON "Credential"("batchId");
CREATE INDEX IF NOT EXISTS "IssuanceBatch_issuerId_idx" ON "IssuanceBatch"("issuerId");
CREATE INDEX IF NOT EXISTS "IssuanceBatch_createdAt_idx" ON "IssuanceBatch"("createdAt");
CREATE INDEX IF NOT EXISTS "CredentialDocumentProof_credentialId_idx" ON "CredentialDocumentProof"("credentialId");
CREATE INDEX IF NOT EXISTS "CredentialDocumentProof_hash_idx" ON "CredentialDocumentProof"("hash");
CREATE INDEX IF NOT EXISTS "CredentialDocumentProof_status_idx" ON "CredentialDocumentProof"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "CredentialDocumentProof_credentialId_hash_key" ON "CredentialDocumentProof"("credentialId", "hash");
CREATE INDEX IF NOT EXISTS "VerificationLog_eventType_idx" ON "VerificationLog"("eventType");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'IssuanceBatch_issuerId_fkey'
  ) THEN
    ALTER TABLE "IssuanceBatch"
      ADD CONSTRAINT "IssuanceBatch_issuerId_fkey"
      FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Credential_batchId_fkey'
  ) THEN
    ALTER TABLE "Credential"
      ADD CONSTRAINT "Credential_batchId_fkey"
      FOREIGN KEY ("batchId") REFERENCES "IssuanceBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CredentialDocumentProof_credentialId_fkey'
  ) THEN
    ALTER TABLE "CredentialDocumentProof"
      ADD CONSTRAINT "CredentialDocumentProof_credentialId_fkey"
      FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
