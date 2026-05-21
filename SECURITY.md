# Certiva — Security Reference

This document describes the security model, controls, and operational guidance for Certiva.

---

## Admin Role Model

Certiva uses a four-tier role hierarchy enforced on every protected backend route.

| Role | Purpose | Key Capabilities |
|------|---------|-----------------|
| **OWNER** | Institution owner / full control | All actions including admin management, settings, revocation, audit logs |
| **SUPER_ADMIN** | Senior operator | Credential issuance, revocation, admin management, settings, audit logs |
| **ADMIN** | Day-to-day operator | Credential issuance, document proofs, verification logs, read-only settings |
| **AUDITOR** | Read-only compliance | View credentials, documents, verification logs, audit logs, settings — no mutations |

### Key constraints

- **OWNER is protected**: The last active OWNER account cannot be deleted, disabled, or demoted.
- **OWNER promotion**: Only an OWNER can elevate another admin to the OWNER role.
- **OWNER protection**: Non-OWNER admins cannot modify or delete OWNER accounts.
- **Self-lock prevention**: An admin cannot disable their own account.
- **Activity protection**: Admins with historical activity (batches, revocations, proofs) cannot be deleted — only disabled.

---

## Permission Model

Backend routes are protected by both a `RolesGuard` (role-level) and a `PermissionGuard` (granular permission checks).

| Permission | OWNER | SUPER_ADMIN | ADMIN | AUDITOR |
|-----------|-------|------------|-------|---------|
| ADMIN_MANAGE | ✓ | ✓ | — | — |
| ADMIN_READ | ✓ | ✓ | — | — |
| CREDENTIAL_CREATE | ✓ | ✓ | ✓ | — |
| CREDENTIAL_READ | ✓ | ✓ | ✓ | ✓ |
| CREDENTIAL_REVOKE | ✓ | ✓ | — | — |
| CREDENTIAL_DELETE | ✓ | ✓ | — | — |
| DOCUMENT_PROOF_CREATE | ✓ | ✓ | ✓ | — |
| DOCUMENT_PROOF_DELETE | ✓ | ✓ | — | — |
| DOCUMENT_PROOF_READ | ✓ | ✓ | ✓ | ✓ |
| VERIFICATION_LOG_READ | ✓ | ✓ | ✓ | ✓ |
| AUDIT_LOG_READ | ✓ | ✓ | ✓ | ✓ |
| SETTINGS_READ | ✓ | ✓ | ✓ | ✓ |
| SETTINGS_UPDATE | ✓ | ✓ | — | — |

Frontend navigation and action visibility reflects role constraints, but **the backend is the authoritative enforcement point**. Frontend hiding is UX only.

---

## JWT & Session Security

### Token structure

JWTs contain only: `sub`, `username`, `email`, `role`, `issuerId`, `tokenVersion`, `iat`, `exp`.

No secrets, passwords, private keys, or sensitive PII are ever included in a JWT payload.

### Token version invalidation

Every Admin record carries a `tokenVersion` integer (default 0).

The JWT strategy validates `payload.tokenVersion === db.tokenVersion` on every authenticated request.

`tokenVersion` is incremented when:

- An admin account is **disabled** (`PATCH /auth/admins/:id` with `active: false`)
- An admin's **role is changed** (invalidates existing sessions for that admin)

This means disabled admins and role-changed admins cannot use previously issued tokens — even if those tokens have not yet expired.

### JWT secret requirements

- Minimum **32 characters**
- In production: must not contain known placeholder values (`secret`, `password`, `replace-me`, `change-me`, etc.)
- Generate with: `openssl rand -base64 48`
- **Production**: Store in a secret manager, KMS, or platform secrets vault. Do not use `.env` files in production.

### Session storage

The Next.js frontend stores the JWT in an `httpOnly`, `secure`, `sameSite: lax` cookie named `certiva_access_token`. The cookie is never readable by client-side JavaScript.

---

## Credential Revocation

### Accountability

Every revocation stores:

- `revokedAt` — timestamp
- `revokedBy` — actor email (string, for historical record)
- `revokedByAdminId` — actor admin ID (FK, for auditability)
- `revocationReason` — enum value (required)
- `revocationNotes` — free text (optional, ≤ 500 chars)

### Required reason values

`DATA_CORRECTION | ISSUED_IN_ERROR | FRAUD_SUSPECTED | INSTITUTION_REQUEST | OTHER | LEGACY`

`LEGACY` is reserved for historical records migrated before Phase 10 that had a free-text reason. It is not selectable in the current UI.

### Rules

- Only `OWNER` and `SUPER_ADMIN` roles can revoke credentials.
- A reason enum value is required (400 if missing).
- Double-revocation of an already-revoked credential returns 409.
- All revocations produce an `AuditLog` entry with full actor/target/metadata.

---

## Audit Log Immutability

`AuditLog` records are **append-only**.

- No `UPDATE` or `DELETE` endpoints are exposed for audit log records.
- Sensitive data (passwords, secrets, private keys, raw auth headers, JWT tokens) is **never written** to audit log metadata.

### Audited events

| Event | When |
|-------|------|
| LOGIN_SUCCESS | Successful admin login |
| LOGIN_FAILURE | Failed login attempt (wrong credentials, inactive account) |
| ADMIN_CREATED | New admin registered |
| ADMIN_UPDATED | Admin profile changed |
| ADMIN_DISABLED | Admin account disabled |
| ADMIN_ROLE_CHANGED | Admin role updated |
| ADMIN_DELETED | Admin deleted |
| CREDENTIAL_ISSUED | Credential record created |
| CREDENTIAL_REVOKED | Credential revoked |
| DOCUMENT_PROOF_CREATED | Secure document proof registered |
| SETTINGS_UPDATED | Institution settings changed |

Audit logs include: `actorAdminId`, `actorUsername`, `targetType`, `targetId`, `metadata`, `ipAddress`, `userAgent`, `createdAt`.

---

## Blockchain Private Key Handling

The `PRIVATE_KEY` env var contains the issuer wallet's private key for signing on-chain transactions.

**Production guidance:**

- Store in a secrets manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, Railway/Render secrets).
- Never commit a real private key to source control.
- Never print or log the private key.
- Rotate the key if exposure is suspected.
- Use a dedicated issuer wallet with minimal on-chain balance — only enough for gas.

In production with `BLOCKCHAIN_ENABLED=true`, the application validates that `PRIVATE_KEY` is present and properly formatted. Known development placeholder keys (all-zeros, all-`a`) are rejected.

---

## Environment Configuration

### Required in production

```
DATABASE_URL          PostgreSQL connection URL
REDIS_URL             Redis connection URL
JWT_SECRET            ≥ 32 chars, non-placeholder, generated with openssl rand -base64 48
JWT_EXPIRES_IN        e.g. 12h (default)
PORT                  API port (default 4000)
CORS_ORIGIN           Comma-separated allowed origins (no wildcard with credentials)
NODE_ENV=production
```

### Blockchain (when enabled)

```
BLOCKCHAIN_ENABLED=true
POLYGON_AMOY_RPC_URL  RPC endpoint URL
PRIVATE_KEY           0x + 64 hex chars — store in secret manager
CONTRACT_ADDRESS      0x + 40 hex chars
ISSUER_WALLET         0x + 40 hex chars
```

### CORS

`corsOrigins` is parsed from `CORS_ORIGIN`. An empty value defaults to `true` (allow all) — this is **only safe for local development**. In production, set an explicit list of trusted origins.

---

## Dependency & Deployment Notes

- Use `pnpm audit` before production deployments to check for known vulnerabilities.
- Keep `@prisma/client`, NestJS, and Next.js dependencies updated.
- Run the application behind a TLS-terminating reverse proxy (nginx, Caddy, cloud LB) in production.
- Set `NODE_ENV=production` — this enables production-mode secret validation and disables development-only fallbacks.
