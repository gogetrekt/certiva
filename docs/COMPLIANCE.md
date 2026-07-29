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
| Credential file metadata (`fileName`, `mimeType`, `fileSize`, `documentHash`) | Possibly — a filename can carry a person's name | PostgreSQL. The uploaded source file itself is **not** retained; only its SHA-256 hash. |
| Secure document proof record (`title`, `documentType`, `referenceNumber`, `fileName`) | Possibly — document titles and filenames frequently name a person | PostgreSQL. Source document discarded after hashing; only the hash + this metadata are kept. |
| Verification identifier / code / QR payload | No (opaque handle) | PostgreSQL; QR/URL shared publicly |
| Registry hash (SHA-256) | No (one-way digest) | PostgreSQL; anchored on-chain |
| Blockchain anchor | **No** | Public chain (Polygon Amoy) |
| Audit log | Actor + action metadata, **no student PII** | PostgreSQL |
| Verification log (credential + secure-document) | Relying-party IP, timestamp | PostgreSQL |
| **Issuer signing private key (Ed25519)** — *most sensitive* | No | PostgreSQL, **encrypted at rest** (AES-256-GCM under `SIGNING_KEY_ENCRYPTION_SECRET`). Decrypted in-memory only during signing; **never** returned by any API or written to logs. No admin UI exposes the plaintext. |
| Issuer signing public key + credential signature | No | PostgreSQL; published freely (verification response, `/proof` bundle, `/api/institution/public-keys`, `did:web` document) — meant to be shared |
| Stored VC proof value (`vcProofValue`) | No (signature over a digest) | PostgreSQL; published in the VC export |
| **Exported Verifiable Credential document** | **Yes — student name and ID in plaintext** | Stored at issuance in `Credential.vcDocument` (PostgreSQL) and served verbatim at `/api/verification/:credentialId/vc`. The same fields already stored in the credential row, held a second time because the signed document cannot be rebuilt without invalidating its proof (see `docs/PLAN.md` P1.9); deleting the credential deletes it. Also a *distribution channel* — see §2. |

## 2. Two different privacy boundaries: on-chain vs the VC export

These are often conflated. They are not the same guarantee, and only one of them is absolute.

**On-chain: a hard boundary.** Only a SHA-256 digest is ever anchored. No operator setting can put personal data on the chain (see §2b below).

**The VC export: deliberately not a boundary.** `GET /api/verification/:credentialId/vc` returns a W3C Verifiable Credential containing `studentName` and `studentId` **in plaintext** — OBv3 `IdentityObject` entries with `hashed: false`. That is intentional: a credential a third party cannot read is not a credential. But the consequences should be stated plainly rather than implied:

- The export is a **portable file**. Once downloaded, that copy is outside the institution's control and outside its retention and deletion policy. Revoking or deleting the credential does not reach copies already saved elsewhere.
- The same is already true of the printed certificate and of the `/proof` bundle. The VC export does not create a new category of exposure, but it does make onward sharing far easier (a machine-readable file built for wallets and automated verifiers).
- OBv3 supports hashed recipient identifiers. Certiva does **not** use them here, because the same values are already printed on the certificate and already covered by the signed public payload — hashing them in the export would protect nothing while making the document unusable.
- The endpoint returns `410 Gone` for revoked or soft-deleted credentials, so it will not mint *new* copies of a withdrawn credential. It cannot invalidate old ones.

Institutions with a data-minimisation obligation should treat "the holder can download a machine-readable credential containing their own name and student number" as a documented, intended data flow — not an incident.

## 2b. PII is never placed on-chain

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
record makes the on-chain hash a reference to nothing recoverable. The same
reasoning does **not** extend to exported VC documents, which hold the data
itself — see §2.

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
  and verifiable, but reports a `REVOKED` status with its revocation date. Both
  revoked and soft-deleted credentials stop being exported as Verifiable
  Credentials (`410 Gone`); copies exported before that point cannot be recalled
  (§2).
- **Verification logs** hold relying-party IP addresses; institutions with a
  data-minimisation obligation should define a retention window and prune old
  verification logs accordingly. (The audit log is intentionally *not* pruned —
  see §6.) How that address is derived — and the one deployment condition under
  which it can be set by the caller rather than observed — is documented in
  [SECURITY.md](../SECURITY.md) under *How the client IP is resolved*. Treat a
  recorded IP as evidence only if that condition is met.

## 6. Audit integrity (tamper-evidence)

The admin/credential audit log is **hash-chained**: every entry stores the hash
of the previous entry (`prevHash`) and a hash of its own content (`entryHash`).

Four things are checked, and each covers a case the others miss:

- **Editing or reordering a row** breaks the `prevHash` → `entryHash` link from
  that point on.
- **Deleting a row** leaves a hole in `seq`, which is a Postgres
  `autoincrement()`. This is what catches a deletion from the *middle*; on its
  own the link check would also catch it, but the two together mean a row cannot
  be removed and the remainder renumbered to hide it.
- **Deleting from the end** — the "remove the record of my last few actions"
  case — is caught by comparing the last row against a chain head stored in a
  separate table (`AuditChainHead`), updated in the same transaction as the row
  it points at. Link-and-seq checking alone cannot see a tail truncation: what
  remains is a shorter chain that is still perfectly continuous.
- **Clearing the table** is caught by the same head: an empty audit log is
  reported as valid only when no head exists, i.e. when nothing was ever
  written.

Integrity is verifiable on demand: `GET /api/audit/action-logs/verify`
(OWNER / SUPER_ADMIN / AUDITOR) runs all four checks and reports the first
break, if any. Because pruning would break the chain, audit rows are retained by
design.

The verdict also reports `totalRows` and `unchained`. `unchained` counts rows
with no `entryHash` — entries written before chaining was introduced. Those rows
are **not** covered by any of the guarantees above, and `valid: true` alongside
`unchained > 0` means "the chained portion is intact", not "the audit log is
intact". Read both numbers.

**What this does and does not prove.** An insider operating through the
application — any admin, any API path — cannot alter, remove or reorder the
record of who issued or revoked what without the verification endpoint saying
so. Someone with direct write access to the database is in a different position:
the chain head lives in the same database as the log, so an attacker who can
write to both tables can move the head to match a log they have edited. The head
raises the cost from one `DELETE` to a coordinated, consistent rewrite of two
tables, and it removes the silent cases entirely — but it is not a substitute
for restricting direct database access, and it is not an off-site anchor.

A `seq` hole is also produced by an ordinary rolled-back transaction, which
burns a sequence value without leaving a row. The verdict names this case
explicitly in its `reason` rather than folding it into a generic failure,
because an operator has to be able to tell the two apart — a hole is reported,
never assumed benign.

## 7. Secrets & transport

- Secrets (`JWT_SECRET`, `SIGNING_KEY_ENCRYPTION_SECRET`, DB/Redis URLs, R2 keys,
  blockchain `PRIVATE_KEY`) are supplied via environment and validated at startup;
  weak placeholders are rejected in staging/production. They are never committed
  and never written to logs.
- `SIGNING_KEY_ENCRYPTION_SECRET` encrypts issuer Ed25519 private keys at rest.
  Changing it in the environment *without* re-encrypting first leaves every
  stored private key permanently undecryptable. It is not, however, a
  one-way door: `apps/api/scripts/rekey-signing-secret.ts` re-encrypts every
  key from the old secret to the new one, validating each round-trip before
  writing anything and aborting without changes if any key fails. The migration
  runbook is in [DEPLOY.md](DEPLOY.md) §5.
- Issuer signing keys themselves are rotated separately and routinely
  (Dashboard → Settings → *Institution verification keys*). Retired keys are
  revoked, never deleted, so previously issued credentials stay verifiable; the
  rotation is written to the audit trail in the same transaction, so a failed
  audit write rolls the rotation back.
- Sessions use `httpOnly`, `secure`, `sameSite=lax` cookies; tokens are not
  reachable from client-side JavaScript.
- TLS is terminated at the operator's reverse proxy (see DEPLOY.md §6);
  `COOKIE_SECURE=true` assumes HTTPS.
