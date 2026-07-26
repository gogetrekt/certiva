# Certiva - Security Policy

This document describes the security model, reporting policy, and operational security baseline for Certiva.

---

## Supported Versions

This repository does not have a public release track. The `main` branch reflects current development state. Security guidance applies to `main`.

---

## Reporting a Vulnerability

If you discover a security vulnerability in this codebase, please report it responsibly.

**Contact:** gogetrekt@archivecircle.xyz

Do not open a public GitHub issue for security vulnerabilities. Report privately so the issue can be assessed and addressed before public disclosure.

When reporting, include:

- A description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested remediation

You will receive an acknowledgement. Confirmed vulnerabilities will be prioritized based on severity.

---

## Admin Role Model

Certiva enforces a four-tier role hierarchy on every protected backend route.

| Role | Capabilities |
|------|-------------|
| OWNER | Full control including admin management, settings, revocation, and audit logs |
| SUPER_ADMIN | Credential issuance, revocation, admin management, settings, audit logs |
| ADMIN | Credential issuance, document proofs, verification logs, read-only settings |
| AUDITOR | Read-only access to credentials, documents, verification logs, audit logs, settings |

Key constraints:

- The last active OWNER account cannot be deleted, disabled, or demoted.
- Only an OWNER can elevate another admin to the OWNER role.
- Non-OWNER admins cannot modify or delete OWNER accounts.
- An admin cannot disable their own account.
- Admins with historical activity (issuance batches, revocations, proofs) cannot be deleted -- only disabled.

The backend is the authoritative enforcement point. Frontend route hiding is UX only.

---

## JWT and Session Security

JWTs contain only: `sub`, `username`, `email`, `role`, `issuerId`, `tokenVersion`, `iat`, `exp`.

No passwords, secrets, private keys, or sensitive PII are ever included in a JWT payload.

The JWT is stored in an `httpOnly`, `secure`, `sameSite: lax` cookie named `certiva_access_token`. It is never accessible to client-side JavaScript.

Every Admin record carries a `tokenVersion` integer. The JWT strategy validates `payload.tokenVersion === db.tokenVersion` on every authenticated request. This ensures disabled admins and role-changed admins cannot reuse previously issued tokens even before expiry.

---

## Environment Security Baseline

### JWT_SECRET

- Minimum 64 characters.
- Must not contain known placeholder values (`secret`, `password`, `replace-me`, `change-me`, etc.) in staging or production. These are rejected at startup.
- Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"`
- Store in a secret manager or platform secrets vault in production. Do not use `.env` files in production.

### SIGNING_KEY_ENCRYPTION_SECRET

- Minimum 32 characters. Known placeholder values are rejected at startup in staging and production.
- Generate with: `openssl rand -hex 32`
- Encrypts every issuer Ed25519 private key at rest (AES-256-GCM). Treat it as equal in value to the database itself: **the database alone is not enough to sign, and this secret alone is not enough either — an attacker needs both.**
- Back it up separately from the database. Losing it makes every stored signing key permanently undecryptable.
- Do not change it in the environment without re-encrypting first — see *Ed25519 Signing Keys* below.

### STORAGE_DRIVER

- Must be `r2` when `NODE_ENV=production` or `APP_ENV=staging`. `local` is rejected there by env validation, so a production deployment cannot silently fall back to writing credential assets onto an ephemeral container filesystem.
- `R2_*` credentials are secrets. Scope the R2 token to the single bucket used for credential assets.

### CORS_ORIGINS

- Must be a comma-separated allowlist of trusted origins.
- Wildcard (`*`) is rejected in staging and production by the env validation layer.
- An empty value is rejected in staging and production.
- Example: `CORS_ORIGINS=https://your-domain.example,http://localhost:3000`

### COOKIE_SECURE

- Set `COOKIE_SECURE=true` when serving over HTTPS - required for staging and production.
- In development over HTTP only, this can be `false`.

### TRUST_PROXY

- Set `TRUST_PROXY=true` when the API runs behind Cloudflare, a reverse proxy, or a tunnel.
- Required for correct IP extraction from `X-Forwarded-For` headers.

### NODE_ENV and APP_ENV

- Set `NODE_ENV=production` in staging and production. This enables production-mode secret validation and disables development fallbacks.
- `APP_ENV=staging` is used to distinguish staging from final production within a `NODE_ENV=production` context.

### Debug and Swagger endpoints

- No public debug endpoints or Swagger UI are exposed in staging or production builds.

---

## Ed25519 Signing Keys

Each institution has its own Ed25519 keypair, used to sign every credential it issues and every W3C Verifiable Credential exported from it. This is the strongest authenticity claim in the system, so its failure modes matter more than most.

**Storage and exposure surface**

- Private keys are stored as AES-256-GCM ciphertext in `IssuerSigningKey.privateKeyEncrypted`, encrypted under `SIGNING_KEY_ENCRYPTION_SECRET` with a fresh random salt and IV per key.
- The plaintext key exists only in process memory, only for the duration of a signing call, inside the signing provider. It never crosses that boundary: no API route, admin UI, log line, or audit entry can return it.
- Public keys are published deliberately — via the verification response, the `/proof` bundle, `GET /api/institution/public-keys`, and the `did:web` document. That is their purpose.

**If a private key is suspected compromised**

1. Rotate immediately: Dashboard → Settings → *Institution verification keys* → rotate (OWNER / SUPER_ADMIN). A new keypair becomes active; the old key is marked revoked with a timestamp and is **not** deleted, so credentials it signed remain verifiable.
2. The rotation and its audit entry (`SIGNING_KEY_ROTATED`) are written in a single transaction. If the audit write fails, the rotation is rolled back — there is no rotation without a record of it.
3. Treat every credential signed by the compromised key as suspect from the point of exposure onward. The signature alone cannot distinguish "signed by the institution" from "signed by whoever held the key". Reconcile against the registry and the audit log, and revoke individually where warranted.
4. `GET /api/institution/public-keys` is the authoritative record of which keys are revoked and when. Direct third-party verifiers there.

**Accepted limit: the `did:web` document is append-only**

Retired keys stay listed in both `verificationMethod` and `assertionMethod` of `/.well-known/did.json`. `did:web` has no version history, so removing a retired key would break verification for every credential it ever signed — credentials the institution still considers valid.

The consequence is deliberate and should not be discovered during an incident: **a leaked key cannot be disabled by editing the DID document.** Revocation lives at `/api/institution/public-keys` (`revokedAt` per key) and in the `/proof` bundle. A verifier that trusts the DID document alone will keep accepting signatures from a retired key. This trade was chosen over the alternative — invalidating historical credentials on every rotation — and is documented rather than fixed.

**Rotating `SIGNING_KEY_ENCRYPTION_SECRET`**

Changing this value in the environment without re-encrypting first bricks every stored key. Use `apps/api/scripts/rekey-signing-secret.ts`, which decrypts under the old secret, re-encrypts under the new one, and verifies each key still matches its stored public key before writing anything — aborting with no changes if any key fails. Runbook: [docs/DEPLOY.md](docs/DEPLOY.md) §5.

**What a signature does not prove**

A valid signature proves the credential's content is authentic and unaltered since issuance. It does **not** prove the credential is currently valid. A `/proof` bundle or exported VC for a credential revoked after download still verifies cryptographically. Revocation status requires contacting the issuing deployment; the VC export endpoint returns `410 Gone` for revoked or soft-deleted credentials, but cannot recall copies already distributed.

---

## Audit Trail Integrity

The `AuditLog` table is hash-chained: each row stores the hash of the previous entry (`prevHash`) and a hash of its own content (`entryHash`).

- **Threat addressed:** an insider with database access quietly editing, deleting, or reordering the record of who issued or revoked what.
- **Detection:** any such change breaks the chain from that point forward. `GET /api/audit/action-logs/verify` (OWNER / SUPER_ADMIN / AUDITOR) recomputes the chain and reports the first break.
- **Limits, stated honestly:** the chain is tamper-*evident*, not tamper-*proof*. It detects modification; it does not prevent it, and it cannot detect truncation of the newest entries followed by continued appending from a forged tip unless the verification output is compared against an external record. Anchor or export the chain head periodically if that threat is in scope.
- Audit rows are never pruned, because pruning would break the chain. No `UPDATE` or `DELETE` route exists for audit records.
- Security-relevant actions covered include login, admin lifecycle changes, credential issuance and revocation, document proof creation, settings changes, and signing key rotation.

---

## Rate Limiting

Per-endpoint limits protect the surfaces an unauthenticated attacker can reach:

| Surface | Why it is limited |
|---|---|
| Auth login | Credential stuffing and password brute force |
| Public verification (code / URL / QR) | Enumeration of verification codes and credential identifiers |
| Verification with file upload | CPU and bandwidth exhaustion from repeated PDF parsing and hashing |
| Admin API routes | Blast radius reduction if an admin session is stolen |

Limits and windows are configurable via `RATE_LIMIT_*` environment variables. Set `RATE_LIMIT_STORE=redis` in staging and production: in-memory counters are per-process, so a multi-instance deployment using them enforces nothing useful. Correct client IP attribution depends on `TRUST_PROXY=true` behind a reverse proxy — without it, every request may appear to originate from the proxy and share a single bucket.

Upload endpoints additionally cap the request body at 10 MB, so a rate limit is not the only defence against large-payload abuse.

---

## Blockchain Private Key

`PRIVATE_KEY` is the issuer wallet's private key for signing on-chain transactions.

- Store in a secrets manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, or platform secrets) in staging and production.
- Never commit a real private key to source control.
- Never print or log the private key.
- Known development placeholder keys (all-zeros, all-`a`) are rejected at startup when `BLOCKCHAIN_ENABLED=true` and the environment is staging or production.
- Use a dedicated issuer wallet with minimal on-chain balance - only enough for gas.
- Rotate the key if exposure is suspected.

---

## Logging Policy

Certiva logs must not include the following:

- JWT tokens or cookie values
- Passwords or password hashes
- `DATABASE_URL` or `REDIS_URL` connection strings
- `PRIVATE_KEY` or any blockchain signing key
- `SIGNING_KEY_ENCRYPTION_SECRET`, or any issuer Ed25519 private key in plaintext or ciphertext form
- Raw uploaded document content
- Full HTTP request bodies containing credentials or file uploads

Structured log output is written to stdout/stderr in JSON format. Log entries include `timestamp`, `level`, `context`, and `message`. Sensitive fields are omitted or redacted before writing.

The `AuditLog` table is append-only. No sensitive values are written to audit log metadata — metadata is limited to non-PII fields such as a credential's public external ID, so student names and degrees are not copied into the audit trail. No `UPDATE` or `DELETE` endpoints are exposed for audit log records. See *Audit Trail Integrity* above.

---

## Dependency Audit

Run `pnpm audit` before production deployments to check for known vulnerabilities in dependencies.

Keep `@prisma/client`, NestJS, and Next.js updated. These are the highest-surface dependencies.

---

## Deployment Notes

- Run the API and worker behind a TLS-terminating reverse proxy (nginx, Caddy, Cloudflare Tunnel, or cloud load balancer) in production.
- Set `NODE_ENV=production` to enable production-mode validation.
- Rate limiting is Redis-backed in staging and production (`RATE_LIMIT_STORE=redis`). Do not use in-memory rate limiting in multi-instance deployments.
- Database and Redis connection strings should be treated as secrets and stored accordingly.
