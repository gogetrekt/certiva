ALTER TABLE "Credential"
ADD COLUMN "txHash" TEXT,
ADD COLUMN "chainId" INTEGER,
ADD COLUMN "anchoredAt" TIMESTAMP(3),
ADD COLUMN "blockNumber" INTEGER,
ADD COLUMN "anchorStatus" TEXT NOT NULL DEFAULT 'PENDING';

CREATE INDEX "Credential_anchorStatus_idx" ON "Credential"("anchorStatus");

CREATE TABLE "BlockchainAnchorLog" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "txHash" TEXT,
    "chainId" INTEGER,
    "blockNumber" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockchainAnchorLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BlockchainAnchorLog_credentialId_idx" ON "BlockchainAnchorLog"("credentialId");
CREATE INDEX "BlockchainAnchorLog_status_idx" ON "BlockchainAnchorLog"("status");
CREATE INDEX "BlockchainAnchorLog_operation_idx" ON "BlockchainAnchorLog"("operation");
CREATE INDEX "BlockchainAnchorLog_createdAt_idx" ON "BlockchainAnchorLog"("createdAt");

ALTER TABLE "BlockchainAnchorLog"
ADD CONSTRAINT "BlockchainAnchorLog_credentialId_fkey"
FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
