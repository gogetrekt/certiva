ALTER TABLE "Credential"
ADD COLUMN "verificationId" TEXT,
ADD COLUMN "revokedAt" TIMESTAMP(3),
ADD COLUMN "revocationReason" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Credential"
SET "verificationId" = CONCAT('legacy_', "id")
WHERE "verificationId" IS NULL;

ALTER TABLE "Credential"
ALTER COLUMN "verificationId" SET NOT NULL;

ALTER TABLE "VerificationLog"
ALTER COLUMN "credentialId" DROP NOT NULL;

CREATE UNIQUE INDEX "Credential_verificationId_key" ON "Credential"("verificationId");
CREATE INDEX "Credential_verificationId_idx" ON "Credential"("verificationId");
