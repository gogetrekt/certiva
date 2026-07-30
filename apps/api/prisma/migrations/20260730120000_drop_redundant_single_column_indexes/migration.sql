-- Each of these columns already carries a UNIQUE constraint, and Postgres backs
-- a unique constraint with a B-tree index that serves exactly the same lookups.
-- The extra @@index was a second copy of that index: more write amplification
-- on every insert and update, no read it could satisfy that the unique index
-- could not.
--
-- Left in place deliberately: BlockchainAnchorLog's @@index([hash]), whose
-- model is unique on (credentialId, hash). A composite unique cannot serve a
-- lookup by hash alone, so that one is not redundant.
DROP INDEX IF EXISTS "Issuer_domain_idx";
DROP INDEX IF EXISTS "Credential_credentialExternalId_idx";
DROP INDEX IF EXISTS "Credential_hash_idx";
DROP INDEX IF EXISTS "Credential_registryHash_idx";
DROP INDEX IF EXISTS "Credential_verificationId_idx";
DROP INDEX IF EXISTS "Credential_verificationCode_idx";
DROP INDEX IF EXISTS "SecureDocumentProof_verificationId_idx";
DROP INDEX IF EXISTS "SecureDocumentProof_verificationCode_idx";
DROP INDEX IF EXISTS "SecureDocumentProof_sourceHash_idx";
