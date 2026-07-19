# Certiva

Certiva is a credential verification platform for institutions that need controlled issuance, public verification, document integrity proof, and audit-ready operational records.

The system is designed around institution-based identity. Public verification represents the issuing institution, not internal operator accounts.

## What Certiva Does

Institutions issue academic or professional credentials into a registry. Each credential carries structured metadata, a verification identifier, a QR payload, and a public verification URL. Relying parties - employers, other institutions, verification services - can confirm credential authenticity without contacting the institution directly.

Secure Documents is a separate surface for document-level integrity. Certiva computes a SHA-256 hash from an uploaded source document, stores proof metadata and the hash record, and discards the source file. Future verification compares uploaded document hashes against stored proof records. The source file is never retained.

Credential authenticity and document authenticity are separate concerns with separate verification paths and separate public interfaces.

## Core Capabilities

- Credential registry with verification codes, QR payloads, and public verification URLs
- Credential verification by code, URL, QR reference, or PDF QR reference
- Secure document proof records with SHA-256 hash integrity verification
- Institution-scoped role-based administration
- Verification logs for relying-party activity
- Tamper-evident, hash-chained audit trail covering the full credential and admin lifecycle (any edit or deletion breaks the chain and is detectable)
- Soft-delete with evidence retention — deleted credentials are withdrawn from active use but never physically destroyed
- Batch credential issuance from CSV
- Blockchain anchoring as an optional secondary audit and integrity layer (Polygon Amoy)
- Object storage via Cloudflare R2 or local filesystem

## Self-Hosting

Certiva is designed to run on infrastructure the institution controls — no third-party dependency for verification, and no student personal data leaves the deployment. The full stack (web, api, worker, PostgreSQL, Redis) runs on a single host via Docker Compose.

```bash
cp .env.prod.example .env      # fill in the REQUIRED values
docker compose -f docker-compose.prod.yml up -d --build
```

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for the complete guide (configuration, first-admin setup, TLS, backups, upgrades). For the data-protection and PII-off-chain posture, see **[docs/COMPLIANCE.md](docs/COMPLIANCE.md)**.

## Architecture

Certiva is a TypeScript monorepo managed with pnpm workspaces and Turborepo.

```
apps/
  web/      Next.js 16 - operator dashboard and public verification UI
  api/      NestJS 11  - domain API, auth, RBAC, registry, verification, audit
  worker/   TypeScript - BullMQ background queue processor and blockchain anchor worker

packages/
  contracts/  Credential registry contract interface and deployment artifacts
  types/      Shared TypeScript domain types
  ui/         Shared interface primitives
  config/     Shared TypeScript and ESLint configuration
```

### Runtime dependencies

| Service | Role |
|---------|------|
| PostgreSQL 16 | Primary data store (Prisma ORM) |
| Redis 7 | BullMQ job queues and rate limiting |
| Cloudflare R2 | Object storage for credential assets and QR codes (or local filesystem for development) |
| Polygon Amoy | Blockchain anchoring layer (optional, enabled via `BLOCKCHAIN_ENABLED=true`) |

### Credential verification flow

1. Institution operator issues a credential - the API generates a verification code, QR payload, registry hash, and verification URL.
2. Relying party accesses the public verification URL or submits a verification code or QR scan.
3. The API resolves the credential, checks registry status (active, revoked, not found), and returns a structured verification result.
4. A verification log entry is written for every relying-party check.

### Secure document verification flow

1. Institution operator registers a document proof - the API hashes the uploaded file (SHA-256), stores proof metadata, and discards the file.
2. Verifier uploads the document for comparison.
3. The API computes the hash of the uploaded file and compares it against the stored proof record.
4. The result (matched, not matched, not found) is returned. A verification log entry is written.

## Security Design

Certiva is built with a security-first posture across all layers.

**Environment validation** - All required environment variables are validated at startup via Zod schema. Weak placeholder values for `JWT_SECRET` are rejected in staging and production. Empty or wildcard `CORS_ORIGINS` is rejected when `NODE_ENV=production` or `APP_ENV=staging`.

**CORS** - `CORS_ORIGINS` accepts a comma-separated allowlist. Wildcard origins are blocked in non-development modes.

**Authentication** - JWTs are stored in `httpOnly`, `secure`, `sameSite: lax` cookies. Tokens are never accessible to client-side JavaScript. Token version invalidation ensures disabled or role-changed admins cannot reuse previously issued tokens.

**Role-based access control** - Four roles: OWNER, SUPER_ADMIN, ADMIN, AUDITOR. Every protected API route is enforced on the backend. Frontend route hiding is UX only.

**Rate limiting** - Configurable per-endpoint limits on auth login, public verification, verification with file upload, and admin API routes. Redis-backed in staging and production.

**Audit logging** - Tamper-evident, hash-chained audit log covering login, admin lifecycle, credential issuance and revocation, document proof creation, and settings changes. Each entry is chained to the previous one (`prevHash → entryHash`), so editing, deleting, or reordering any row breaks the chain — verifiable via `GET /api/audit/action-logs/verify`. No sensitive values (passwords, tokens, private keys) are written to audit log metadata.

**Evidence retention** - Credential deletion is a soft-delete: the row, its verification/proof/anchor logs, and stored assets are retained for forensics. Deleted credentials are excluded from verification and listings but never physically removed, so evidence of issuance or fraud cannot be silently destroyed.

**Safe logging** - The API and worker use a structured logging approach that never writes JWTs, cookies, passwords, `DATABASE_URL`, `REDIS_URL`, `PRIVATE_KEY`, or raw uploaded document content to logs.

**Object storage** - Credential assets are stored in Cloudflare R2 (or locally in development). The storage layer is abstracted behind a `StorageService` interface so the driver can be swapped without changing domain code.

**Blockchain** - Private key handling is isolated. Known development placeholder keys are rejected in staging and production. Blockchain usage is limited to hash anchoring. No personal data, PDFs, student IDs, or emails are placed on-chain.

**Deletion protections** - Admins with historical activity cannot be deleted, only disabled. The last active OWNER account cannot be deleted, disabled, or demoted.

## Repository Structure

```
apps/api/prisma/schema.prisma   Database schema (Prisma)
apps/api/src/config/            Environment validation (Zod) and app configuration
apps/api/src/common/storage/    StorageService abstraction (local + R2 drivers)
apps/api/src/modules/           Domain modules: auth, credential, document-proof, admin, audit, verification
apps/api/scripts/               One-time migration and maintenance scripts
apps/web/src/app/               Next.js App Router (dashboard and public verification surfaces)
apps/worker/src/                BullMQ workers: issuance, credential-anchor, retry
scripts/                        Operational scripts (backup)
docker-compose.yml              Local dev PostgreSQL 16 and Redis 7 services
docker-compose.prod.yml         Full self-host stack (web, api, worker, db, redis, migrate)
docs/DEPLOY.md                  Self-host deployment guide
docs/COMPLIANCE.md              Data-protection posture (PII off-chain, retention, audit integrity)
```

## Scripts Reference

From the monorepo root:

```
pnpm dev      Start all apps in watch mode (Turborepo)
pnpm build    Build all apps
pnpm lint     Lint all apps
```

Per-app scripts are in each `apps/*/package.json`. The API `dev` script runs `prisma migrate deploy` before starting in watch mode.

## Status

Pre-production / dev phase. Security fundamentals in place (guarded admin routes, rate-limited public verification, upload caps, PII kept off public responses and off-chain, tamper-evident audit, soft-delete evidence retention). Self-host deployment artifacts are provided (see [docs/DEPLOY.md](docs/DEPLOY.md)). Not yet deployed to a production institution.

Environment configuration, infrastructure access, and production secrets are controlled by the project owner.
