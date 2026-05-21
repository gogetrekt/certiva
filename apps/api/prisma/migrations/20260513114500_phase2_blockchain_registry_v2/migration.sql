ALTER TABLE "Credential"
ADD COLUMN "revocationTxHash" TEXT,
ADD COLUMN "chainStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "chainSyncedAt" TIMESTAMP(3),
ADD COLUMN "anchorVersion" TEXT NOT NULL DEFAULT 'V1',
ADD COLUMN "issuerWallet" TEXT,
ADD COLUMN "chainVerificationMetadata" JSONB,
ADD COLUMN "revokedBy" TEXT;

CREATE INDEX "Credential_chainStatus_idx" ON "Credential"("chainStatus");
CREATE INDEX "Credential_anchorVersion_idx" ON "Credential"("anchorVersion");
