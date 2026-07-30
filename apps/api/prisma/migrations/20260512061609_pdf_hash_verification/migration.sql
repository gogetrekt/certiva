ALTER TABLE "Credential"
ADD COLUMN "documentHash" TEXT,
ADD COLUMN "fileName" TEXT,
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "fileSize" INTEGER;

ALTER TABLE "Credential"
RENAME COLUMN "lastVerifiedAt" TO "verifiedAt";

CREATE UNIQUE INDEX "Credential_documentHash_key" ON "Credential"("documentHash");

ALTER TABLE "VerificationLog"
ADD COLUMN "uploadedHash" TEXT,
ADD COLUMN "matched" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "status" TEXT,
ADD COLUMN "ipAddress" TEXT;

ALTER TABLE "VerificationLog"
RENAME COLUMN "verifiedAt" TO "createdAt";

ALTER TABLE "VerificationLog"
RENAME COLUMN "ip" TO "ipAddress_legacy";

UPDATE "VerificationLog"
SET
  "matched" = CASE WHEN "credentialId" IS NULL THEN false ELSE true END,
  "status" = "result"::text,
  "ipAddress" = NULLIF("ipAddress_legacy", '');

ALTER TABLE "VerificationLog"
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "ipAddress_legacy" DROP NOT NULL,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "VerificationLog"
DROP COLUMN "ipAddress_legacy",
DROP COLUMN "result";

DROP INDEX IF EXISTS "VerificationLog_verifiedAt_idx";
DROP INDEX IF EXISTS "VerificationLog_credentialId_verifiedAt_idx";

CREATE INDEX "VerificationLog_createdAt_idx" ON "VerificationLog"("createdAt");
CREATE INDEX "VerificationLog_status_idx" ON "VerificationLog"("status");
CREATE INDEX "VerificationLog_credentialId_createdAt_idx" ON "VerificationLog"("credentialId", "createdAt");
