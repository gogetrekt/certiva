CREATE TYPE "VerificationMode" AS ENUM ('CORE_REGISTRY', 'SECURE_PDF');
CREATE TYPE "IssuanceBatchSourceType" AS ENUM ('CSV', 'API');
CREATE TYPE "CredentialDocumentProofSourceType" AS ENUM ('SINGLE_PDF', 'BATCH_ZIP');
CREATE TYPE "CredentialDocumentProofStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'REVOKED');
CREATE TYPE "VerificationEventType" AS ENUM ('REGISTRY_CODE_LOOKUP', 'QR_LOOKUP', 'PDF_INTEGRITY_CHECK');

ALTER TABLE "Credential"
  ADD COLUMN "credentialExternalId" TEXT,
  ADD COLUMN "verificationCode" TEXT,
  ADD COLUMN "signedVerificationToken" TEXT,
  ADD COLUMN "qrPayload" TEXT,
  ADD COLUMN "verificationMode" "VerificationMode" NOT NULL DEFAULT 'CORE_REGISTRY',
  ADD COLUMN "securePdfEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "registryHash" TEXT,
  ADD COLUMN "chainProofHash" TEXT,
  ADD COLUMN "graduationYear" INTEGER,
  ADD COLUMN "batchId" TEXT;

CREATE TABLE "IssuanceBatch" (
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

CREATE TABLE "CredentialDocumentProof" (
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
  ADD COLUMN "eventType" "VerificationEventType" NOT NULL DEFAULT 'REGISTRY_CODE_LOOKUP';

ALTER TABLE "Credential" ALTER COLUMN "certificateUri" DROP NOT NULL;

UPDATE "Credential"
SET
  "credentialExternalId" = "id",
  "verificationCode" = "verificationId",
  "signedVerificationToken" = lpad(md5("id" || ':' || "verificationId" || ':' || "hash"), 64, '0'),
  "qrPayload" = "verificationUrl",
  "registryHash" = "hash",
  "chainProofHash" = "hash",
  "verificationMode" = CASE
    WHEN "documentHash" IS NULL THEN 'CORE_REGISTRY'::"VerificationMode"
    ELSE 'SECURE_PDF'::"VerificationMode"
  END,
  "securePdfEnabled" = "documentHash" IS NOT NULL;

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
  'migration',
  'SINGLE_PDF'::"CredentialDocumentProofSourceType",
  'ACTIVE'::"CredentialDocumentProofStatus"
FROM "Credential"
WHERE "documentHash" IS NOT NULL;

ALTER TABLE "Credential"
  ALTER COLUMN "credentialExternalId" SET NOT NULL,
  ALTER COLUMN "verificationCode" SET NOT NULL,
  ALTER COLUMN "signedVerificationToken" SET NOT NULL,
  ALTER COLUMN "qrPayload" SET NOT NULL,
  ALTER COLUMN "registryHash" SET NOT NULL,
  ALTER COLUMN "chainProofHash" SET NOT NULL;

CREATE UNIQUE INDEX "Credential_credentialExternalId_key" ON "Credential"("credentialExternalId");
CREATE UNIQUE INDEX "Credential_verificationCode_key" ON "Credential"("verificationCode");
CREATE UNIQUE INDEX "Credential_signedVerificationToken_key" ON "Credential"("signedVerificationToken");
CREATE UNIQUE INDEX "Credential_registryHash_key" ON "Credential"("registryHash");
CREATE UNIQUE INDEX "Credential_chainProofHash_key" ON "Credential"("chainProofHash");
CREATE INDEX "Credential_credentialExternalId_idx" ON "Credential"("credentialExternalId");
CREATE INDEX "Credential_registryHash_idx" ON "Credential"("registryHash");
CREATE INDEX "Credential_verificationMode_idx" ON "Credential"("verificationMode");
CREATE INDEX "Credential_securePdfEnabled_idx" ON "Credential"("securePdfEnabled");
CREATE INDEX "Credential_batchId_idx" ON "Credential"("batchId");
CREATE INDEX "IssuanceBatch_issuerId_idx" ON "IssuanceBatch"("issuerId");
CREATE INDEX "IssuanceBatch_createdAt_idx" ON "IssuanceBatch"("createdAt");
CREATE INDEX "CredentialDocumentProof_credentialId_idx" ON "CredentialDocumentProof"("credentialId");
CREATE INDEX "CredentialDocumentProof_hash_idx" ON "CredentialDocumentProof"("hash");
CREATE INDEX "CredentialDocumentProof_status_idx" ON "CredentialDocumentProof"("status");
CREATE UNIQUE INDEX "CredentialDocumentProof_credentialId_hash_key" ON "CredentialDocumentProof"("credentialId", "hash");
CREATE INDEX "VerificationLog_eventType_idx" ON "VerificationLog"("eventType");

ALTER TABLE "IssuanceBatch" ADD CONSTRAINT "IssuanceBatch_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "IssuanceBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CredentialDocumentProof" ADD CONSTRAINT "CredentialDocumentProof_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
