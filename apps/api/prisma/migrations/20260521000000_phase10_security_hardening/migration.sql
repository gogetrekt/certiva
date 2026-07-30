-- Phase 10: Security Hardening Migration

-- Add new enum values to AdminRole
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'OWNER';
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'AUDITOR';

-- Create RevocationReason enum
DO $$ BEGIN
  CREATE TYPE "RevocationReason" AS ENUM (
    'DATA_CORRECTION',
    'ISSUED_IN_ERROR',
    'FRAUD_SUSPECTED',
    'INSTITUTION_REQUEST',
    'OTHER',
    'LEGACY'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create AuditAction enum
DO $$ BEGIN
  CREATE TYPE "AuditAction" AS ENUM (
    'LOGIN_SUCCESS',
    'LOGIN_FAILURE',
    'LOGOUT',
    'ADMIN_CREATED',
    'ADMIN_UPDATED',
    'ADMIN_DISABLED',
    'ADMIN_DELETED',
    'ADMIN_ROLE_CHANGED',
    'ADMIN_PASSWORD_CHANGED',
    'CREDENTIAL_ISSUED',
    'CREDENTIAL_REVOKED',
    'CREDENTIAL_DELETED',
    'DOCUMENT_PROOF_CREATED',
    'DOCUMENT_PROOF_DELETED',
    'SETTINGS_UPDATED',
    'FORBIDDEN_ATTEMPT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add tokenVersion to Admin (default 0 for all existing records)
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Add revokedByAdminId and revocationNotes to Credential
ALTER TABLE "Credential" ADD COLUMN IF NOT EXISTS "revokedByAdminId" TEXT;
ALTER TABLE "Credential" ADD COLUMN IF NOT EXISTS "revocationNotes" TEXT;

-- Change revocationReason from TEXT to RevocationReason enum on Credential
-- Preserve existing data: map any old string values to LEGACY
ALTER TABLE "Credential" ADD COLUMN IF NOT EXISTS "revocationReason_new" "RevocationReason";
UPDATE "Credential" SET "revocationReason_new" = 'LEGACY' WHERE "revocationReason" IS NOT NULL;
ALTER TABLE "Credential" DROP COLUMN IF EXISTS "revocationReason";
ALTER TABLE "Credential" RENAME COLUMN "revocationReason_new" TO "revocationReason";

-- Add revokedByAdminId and revocationNotes to SecureDocumentProof
ALTER TABLE "SecureDocumentProof" ADD COLUMN IF NOT EXISTS "revokedByAdminId" TEXT;
ALTER TABLE "SecureDocumentProof" ADD COLUMN IF NOT EXISTS "revocationNotes" TEXT;

-- Change revocationReason from TEXT to RevocationReason enum on SecureDocumentProof
ALTER TABLE "SecureDocumentProof" ADD COLUMN IF NOT EXISTS "revocationReason_new" "RevocationReason";
UPDATE "SecureDocumentProof" SET "revocationReason_new" = 'LEGACY' WHERE "revocationReason" IS NOT NULL;
ALTER TABLE "SecureDocumentProof" DROP COLUMN IF EXISTS "revocationReason";
ALTER TABLE "SecureDocumentProof" RENAME COLUMN "revocationReason_new" TO "revocationReason";

-- Create AuditLog table (append-only — no update/delete endpoints will be exposed)
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"            TEXT         NOT NULL,
  "action"        "AuditAction" NOT NULL,
  "actorAdminId"  TEXT,
  "actorUsername" TEXT,
  "targetType"    TEXT,
  "targetId"      TEXT,
  "metadata"      JSONB,
  "ipAddress"     TEXT,
  "userAgent"     TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_actorAdminId_idx" ON "AuditLog"("actorAdminId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
