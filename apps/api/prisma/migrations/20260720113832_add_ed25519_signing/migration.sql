-- DropForeignKey
ALTER TABLE "VerificationLog" DROP CONSTRAINT "VerificationLog_credentialId_fkey";

-- DropIndex
DROP INDEX "Credential_securePdfEnabled_idx";

-- DropIndex
DROP INDEX "Credential_verificationMode_idx";

-- DropIndex
DROP INDEX "VerificationLog_eventType_idx";

-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "publicPayload" TEXT,
ADD COLUMN     "signature" TEXT,
ADD COLUMN     "signatureAlgorithm" TEXT DEFAULT 'Ed25519',
ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "signingKeyId" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "metadataJson" DROP DEFAULT,
ALTER COLUMN "qrCodeUri" DROP DEFAULT,
ALTER COLUMN "certificateUri" DROP DEFAULT,
ALTER COLUMN "verificationUrl" DROP DEFAULT;

-- CreateTable
CREATE TABLE "IssuerSigningKey" (
    "id" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKeyEncrypted" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'Ed25519',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "IssuerSigningKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IssuerSigningKey_keyId_key" ON "IssuerSigningKey"("keyId");

-- CreateIndex
CREATE INDEX "IssuerSigningKey_issuerId_idx" ON "IssuerSigningKey"("issuerId");

-- CreateIndex
CREATE INDEX "IssuerSigningKey_active_idx" ON "IssuerSigningKey"("active");

-- CreateIndex
CREATE INDEX "Credential_verificationCode_idx" ON "Credential"("verificationCode");

-- CreateIndex
CREATE INDEX "Credential_signingKeyId_idx" ON "Credential"("signingKeyId");

-- AddForeignKey
ALTER TABLE "IssuerSigningKey" ADD CONSTRAINT "IssuerSigningKey_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_signingKeyId_fkey" FOREIGN KEY ("signingKeyId") REFERENCES "IssuerSigningKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationLog" ADD CONSTRAINT "VerificationLog_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
