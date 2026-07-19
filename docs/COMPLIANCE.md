# Data Protection & Compliance Posture

How Certiva handles personal data, what goes where, and the integrity guarantees
behind the audit trail. This document describes the system as built; it is not
legal advice — an institution's DPO/legal team owns the final compliance
determination for their jurisdiction (e.g. Indonesia's PDP Law, GDPR, FERPA).

## 1. Data classification

| Data | Contains PII? | Where it lives |
|---|---|---|
| Credential record (student name, degree, dates, IDs) | **Yes** | PostgreSQL, on the institution's own host |
| Credential assets (certificate PDF, QR image) | Possibly | Object storage (Cloudflare R2), institution-owned bucket |
| Verification identifier / code / QR payload | No (opaque handle) | PostgreSQL; QR/URL shared publicly |
| Registry hash (SHA-256) | No (one-way digest) | PostgreSQL; anchored on-chain |
| Blockchain anchor | **No** | Public chain (Polygon Amoy) |
| Audit log | Actor + action metadata, **no student PII** | PostgreSQL |
| Verification log | Relying-party IP, timestamp | PostgreSQL |

## 2. PII is never placed on-chain

This is a hard architectural boundary, not a policy the operator can misconfigure.

- The only thing anchored to the blockchain is a **SHA-256 hash** of the
  credential record — a one-way digest. Student names, IDs, emails, dates, and
  PDFs are **never** written on-chain.
- A verifier confirms authenticity by re-hashing the credential they were given
  and matching it against the anchored hash. The chain proves *"this exact
  record existed and was issued by this institution"* without revealing its
  contents to anyone reading the chain.
- Blockchain anchoring is **optional** (`BLOCKCHAIN_ENABLED=false` by default). A
  deployment that never enables it still has a fully functional verification
  system backed by the institution's own database.

Because the chain holds only a digest, the GDPR "right to erasure" tension with
immutable ledgers does not arise for personal data: erasing the off-chain
record makes the on-chain hash a reference to nothing recoverable.

## 3. Data residency & control

Certiva is **self-hosted**. The application, database, and job queue all run on
infrastructure the institution controls (see [DEPLOY.md](DEPLOY.md)). There is
no Certiva-operated cloud service in the verification path, and no student data
is transmitted to the software vendor. Object storage points at the
institution's own Cloudflare R2 bucket.

## 4. Access control & data minimisation

- **Public verification responses carry no PII beyond what the credential is
  meant to attest.** Internal identifiers (student ID, internal verification
  code, signed tokens) are stripped from public responses.
- Admin access is role-based (OWNER, SUPER_ADMIN, ADMIN, AUDITOR), enforced
  server-side on every protected route, and scoped per issuing institution.
- Audit-log metadata is limited to non-PII fields (e.g. the credential's public
  external ID) — student names and degrees are **not** copied into the audit
  trail.

## 5. Retention & deletion

- **Soft-delete with evidence retention.** Deleting a credential sets a
  `deletedAt` marker and records the actor; the row, its logs, and stored assets
  are retained. Deleted credentials are excluded from verification and admin
  listings but are never physically destroyed — so evidence of issuance (or of
  fraud) cannot be silently erased.
- **Revocation** is distinct from deletion: a revoked credential remains visible
  and verifiable, but reports a `REVOKED` status with its revocation date.
- **Verification logs** hold relying-party IP addresses; institutions with a
  data-minimisation obligation should define a retention window and prune old
  verification logs accordingly. (The audit log is intentionally *not* pruned —
  see §6.)

## 6. Audit integrity (tamper-evidence)

The admin/credential audit log is **hash-chained**: every entry stores the hash
of the previous entry (`prevHash`) and a hash of its own content (`entryHash`).

- Editing, deleting, or reordering any row breaks the chain from that point on.
- Integrity is verifiable on demand:
  `GET /api/audit/action-logs/verify` (OWNER / SUPER_ADMIN / AUDITOR) recomputes
  the chain and reports the first break, if any.
- Because pruning would break the chain, audit rows are retained by design.

This gives an institution a defensible answer to *"can an insider quietly alter
the record of who issued or revoked what?"* — no, not without detection.

## 7. Secrets & transport

- Secrets (`JWT_SECRET`, DB/Redis URLs, R2 keys, blockchain `PRIVATE_KEY`) are
  supplied via environment and validated at startup; weak placeholders are
  rejected in staging/production. They are never committed and never written to
  logs.
- Sessions use `httpOnly`, `secure`, `sameSite=lax` cookies; tokens are not
  reachable from client-side JavaScript.
- TLS is terminated at the operator's reverse proxy (see DEPLOY.md §6);
  `COOKIE_SECURE=true` assumes HTTPS.
