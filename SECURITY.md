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
- Raw uploaded document content
- Full HTTP request bodies containing credentials or file uploads

Structured log output is written to stdout/stderr in JSON format. Log entries include `timestamp`, `level`, `context`, and `message`. Sensitive fields are omitted or redacted before writing.

The `AuditLog` table is append-only. No sensitive values are written to audit log metadata. No `UPDATE` or `DELETE` endpoints are exposed for audit log records.

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
