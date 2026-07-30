DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentProofVerificationSource') THEN
    CREATE TYPE "DocumentProofVerificationSource" AS ENUM ('CODE_LOOKUP', 'QR_LOOKUP', 'PDF_UPLOAD');
  END IF;
END $$;

CREATE TABLE "SecureDocumentProof" (
  "id" TEXT NOT NULL,
  "proofExternalId" TEXT NOT NULL,
  "verificationId" TEXT NOT NULL,
  "verificationCode" TEXT NOT NULL,
  "signedVerificationToken" TEXT NOT NULL,
  "qrPayload" TEXT NOT NULL,
  "proofUrl" TEXT NOT NULL,
  "metadataUri" TEXT NOT NULL,
  "qrCodeUri" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "referenceNumber" TEXT,
  "documentDate" TIMESTAMP(3),
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "txHash" TEXT,
  "chainId" INTEGER,
  "anchoredAt" TIMESTAMP(3),
  "blockNumber" INTEGER,
  "anchorStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "chainStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "chainSyncedAt" TIMESTAMP(3),
  "anchorVersion" TEXT NOT NULL DEFAULT 'V2',
  "issuerWallet" TEXT,
  "chainVerificationMetadata" JSONB,
  "revoked" BOOLEAN NOT NULL DEFAULT false,
  "revokedAt" TIMESTAMP(3),
  "revokedBy" TEXT,
  "revocationReason" TEXT,
  "verificationCount" INTEGER NOT NULL DEFAULT 0,
  "verifiedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "issuerId" TEXT NOT NULL,

  CONSTRAINT "SecureDocumentProof_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecureDocumentProofVerificationLog" (
  "id" TEXT NOT NULL,
  "documentProofId" TEXT,
  "sourceType" "DocumentProofVerificationSource" NOT NULL DEFAULT 'PDF_UPLOAD',
  "uploadedHash" TEXT,
  "matched" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SecureDocumentProofVerificationLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SecureDocumentProof_proofExternalId_key" ON "SecureDocumentProof"("proofExternalId");
CREATE UNIQUE INDEX "SecureDocumentProof_verificationId_key" ON "SecureDocumentProof"("verificationId");
CREATE UNIQUE INDEX "SecureDocumentProof_verificationCode_key" ON "SecureDocumentProof"("verificationCode");
CREATE UNIQUE INDEX "SecureDocumentProof_signedVerificationToken_key" ON "SecureDocumentProof"("signedVerificationToken");
CREATE UNIQUE INDEX "SecureDocumentProof_sourceHash_key" ON "SecureDocumentProof"("sourceHash");

CREATE INDEX "SecureDocumentProof_issuerId_idx" ON "SecureDocumentProof"("issuerId");
CREATE INDEX "SecureDocumentProof_verificationId_idx" ON "SecureDocumentProof"("verificationId");
CREATE INDEX "SecureDocumentProof_verificationCode_idx" ON "SecureDocumentProof"("verificationCode");
CREATE INDEX "SecureDocumentProof_sourceHash_idx" ON "SecureDocumentProof"("sourceHash");
CREATE INDEX "SecureDocumentProof_anchorStatus_idx" ON "SecureDocumentProof"("anchorStatus");
CREATE INDEX "SecureDocumentProof_chainStatus_idx" ON "SecureDocumentProof"("chainStatus");

CREATE INDEX "SecureDocumentProofVerificationLog_documentProofId_idx" ON "SecureDocumentProofVerificationLog"("documentProofId");
CREATE INDEX "SecureDocumentProofVerificationLog_createdAt_idx" ON "SecureDocumentProofVerificationLog"("createdAt");
CREATE INDEX "SecureDocumentProofVerificationLog_status_idx" ON "SecureDocumentProofVerificationLog"("status");

ALTER TABLE "SecureDocumentProof"
  ADD CONSTRAINT "SecureDocumentProof_issuerId_fkey"
  FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SecureDocumentProofVerificationLog"
  ADD CONSTRAINT "SecureDocumentProofVerificationLog_documentProofId_fkey"
  FOREIGN KEY ("documentProofId") REFERENCES "SecureDocumentProof"("id") ON DELETE SET NULL ON UPDATE CASCADE;
