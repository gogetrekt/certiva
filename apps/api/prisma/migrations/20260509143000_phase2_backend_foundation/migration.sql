-- CreateIndex
CREATE UNIQUE INDEX "Issuer_wallet_key" ON "Issuer"("wallet");

-- CreateIndex
CREATE INDEX "Credential_studentId_idx" ON "Credential"("studentId");

-- CreateIndex
CREATE INDEX "Credential_issuerId_studentId_idx" ON "Credential"("issuerId", "studentId");

-- CreateIndex
CREATE INDEX "VerificationLog_credentialId_verifiedAt_idx" ON "VerificationLog"("credentialId", "verifiedAt");
