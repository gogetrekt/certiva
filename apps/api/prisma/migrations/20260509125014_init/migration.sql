-- CreateEnum
CREATE TYPE "IssuerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ISSUER_ADMIN');

-- CreateEnum
CREATE TYPE "VerificationResult" AS ENUM ('VALID', 'INVALID', 'REVOKED', 'NOT_FOUND');

-- CreateTable
CREATE TABLE "Issuer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "wallet" TEXT,
    "status" "IssuerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issuer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "metadataUri" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuerId" TEXT NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ISSUER_ADMIN',
    "issuerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationLog" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,
    "result" "VerificationResult" NOT NULL,

    CONSTRAINT "VerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Issuer_domain_key" ON "Issuer"("domain");

-- CreateIndex
CREATE INDEX "Issuer_domain_idx" ON "Issuer"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_hash_key" ON "Credential"("hash");

-- CreateIndex
CREATE INDEX "Credential_issuerId_idx" ON "Credential"("issuerId");

-- CreateIndex
CREATE INDEX "Credential_hash_idx" ON "Credential"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_issuerId_idx" ON "Admin"("issuerId");

-- CreateIndex
CREATE INDEX "VerificationLog_credentialId_idx" ON "VerificationLog"("credentialId");

-- CreateIndex
CREATE INDEX "VerificationLog_verifiedAt_idx" ON "VerificationLog"("verifiedAt");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationLog" ADD CONSTRAINT "VerificationLog_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
