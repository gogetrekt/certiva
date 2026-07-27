-- Database-level guard against duplicate live credentials for the same
-- (issuer, student, degree). The application-layer check in bulkIssue reads
-- existing keys before the commit loop, so two concurrent commits both pass it
-- and both insert (TOCTOU); single create() had no check at all.
--
-- Partial index, not @@unique([issuerId, studentId, degree]): a revoked row
-- stays in the table with revoked = true, so a plain unique constraint would
-- lock the (student, degree) pair permanently and make re-issuance after a
-- legitimate revocation (e.g. reason DATA_CORRECTION) impossible without a
-- hard delete. Prisma has no declarative syntax for partial indexes, so this
-- index lives only here — see the comment on model Credential in schema.prisma.
CREATE UNIQUE INDEX "credential_issuer_student_degree_active_key"
  ON "Credential" ("issuerId", "studentId", "degree")
  WHERE "deletedAt" IS NULL AND "revoked" = false;
