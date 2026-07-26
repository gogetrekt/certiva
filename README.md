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
- Per-institution Ed25519 credential signatures, with manual key rotation and a retained key history
- Self-contained proof bundle (`/proof`) a third party can check without a Certiva server
- Export to W3C Verifiable Credentials 2.0 / Open Badges 3.0, with the institution published as a `did:web` identity
- Blockchain anchoring as an optional secondary audit and integrity layer (Polygon Amoy)
- Object storage via Cloudflare R2 or local filesystem

## Self-Hosting

Certiva is designed to run on infrastructure the institution controls — no third-party dependency for verification, and no student personal data is sent to the software vendor or written on-chain. The full stack (web, api, worker, PostgreSQL, Redis) runs on a single host via Docker Compose.

One deliberate exception to "data stays in the deployment": the standards export below produces a portable credential file that contains the student's name and ID in plaintext, by design — that is what makes it verifiable elsewhere. Once a holder downloads it, that copy is outside the institution's control. See [docs/COMPLIANCE.md](docs/COMPLIANCE.md) §2.

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
  types/      Domain types shared by api, web, and worker — the single source
              for BlockchainOperation and the queue job payloads
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
3. The API resolves the credential, checks registry status (active, revoked, not found), re-checks the Ed25519 signature over the credential's public payload, and returns a structured verification result.
4. A verification log entry is written for every relying-party check.

### Independent verification (no live Certiva required)

Two export formats let a relying party check a credential outside Certiva. Both prove the content is authentic and unaltered since issuance; **neither proves the credential is still valid today** — revocation is only visible by contacting the issuing deployment.

| Endpoint | Format |
|---|---|
| `GET /api/verification/:credentialId/proof` | Certiva's own bundle: public payload + Ed25519 signature + public key. No VC library needed. |
| `GET /api/verification/:credentialId/vc` | W3C VC 2.0 / Open Badges 3.0 document with an `eddsa-jcs-2022` Data Integrity proof. `410 Gone` if the credential has been revoked. |
| `GET /.well-known/did.json` | The institution's `did:web` document, publishing its signing keys as `Multikey` entries. |

See **[docs/VERIFIABLE-CREDENTIALS.md](docs/VERIFIABLE-CREDENTIALS.md)** for the field mapping, a worked verification example, and the limits of what the signature proves.

### Secure document verification flow

1. Institution operator registers a document proof - the API hashes the uploaded file (SHA-256), stores proof metadata, and discards the file.
2. Verifier uploads the document for comparison.
3. The API computes the hash of the uploaded file and compares it against the stored proof record.
4. The result (matched, not matched, not found) is returned. A verification log entry is written.

## Security Design

Certiva is built with a security-first posture across all layers.

**Environment validation** - All required environment variables are validated at startup via Zod schema. Weak placeholder values for `JWT_SECRET` and `SIGNING_KEY_ENCRYPTION_SECRET` are rejected in staging and production. Empty or wildcard `CORS_ORIGINS` is rejected when `NODE_ENV=production` or `APP_ENV=staging`.

**CORS** - `CORS_ORIGINS` accepts a comma-separated allowlist. Wildcard origins are blocked in non-development modes.

**Authentication** - JWTs are stored in `httpOnly`, `secure`, `sameSite: lax` cookies. Tokens are never accessible to client-side JavaScript. Token version invalidation ensures disabled or role-changed admins cannot reuse previously issued tokens.

**Role-based access control** - Four roles: OWNER, SUPER_ADMIN, ADMIN, AUDITOR. Every protected API route is enforced on the backend. Frontend route hiding is UX only.

**Rate limiting** - Configurable per-endpoint limits on auth login, public verification, verification with file upload, and admin API routes. Redis-backed in staging and production.

**Audit logging** - Tamper-evident, hash-chained audit log covering login, admin lifecycle, credential issuance and revocation, document proof creation, and settings changes. Each entry is chained to the previous one (`prevHash → entryHash`), so editing, deleting, or reordering any row breaks the chain — verifiable via `GET /api/audit/action-logs/verify`. No sensitive values (passwords, tokens, private keys) are written to audit log metadata.

**Evidence retention** - Credential deletion is a soft-delete: the row, its verification/proof/anchor logs, and stored assets are retained for forensics. Deleted credentials are excluded from verification and listings but never physically removed, so evidence of issuance or fraud cannot be silently destroyed.

**Safe logging** - The API and worker use a structured logging approach that never writes JWTs, cookies, passwords, `DATABASE_URL`, `REDIS_URL`, `PRIVATE_KEY`, or raw uploaded document content to logs.

**Object storage** - Credential assets are stored in Cloudflare R2 (or locally in development). The storage layer is abstracted behind a `StorageService` interface so the driver can be swapped without changing domain code.

**Credential signatures (Ed25519)** - Each issued credential is signed with the issuing institution's Ed25519 key over a canonical, secret-free public payload (student name/ID, degree, graduation year, issuer domain/name, issue date — every field printed on the certificate). Keys are per-issuer with a rotation history (old keys are revoked, never deleted, so older credentials stay verifiable). Rotation is manual and operator-driven (Dashboard → Settings → *Institution verification keys*, OWNER / SUPER_ADMIN), recorded in the audit trail as `SIGNING_KEY_ROTATED` in the same transaction as the rotation itself — if the audit write fails, the rotation is rolled back. The active key and full key history are published unauthenticated at `GET /api/institution/public-keys`. Private keys are AES-256-GCM encrypted at rest under `SIGNING_KEY_ENCRYPTION_SECRET`, decrypted in memory only during signing, and never exposed via any API or log. Verification recomputes the signature independently, and `GET /api/verification/:credentialId/proof` returns a self-contained bundle a third party can verify with the bundled public key and no live Certiva server. That check proves the credential's content is authentic and unaltered; it does **not** prove the credential is still valid — a bundle for a credential revoked after download will still verify cryptographically, so current status requires contacting the deployment. Credentials issued before this feature simply report `signature: null` and remain verifiable as before.

**Standards export (W3C VC 2.0 / Open Badges 3.0 + `did:web`)** — Every signed credential can also be exported as a W3C Verifiable Credential secured with an `eddsa-jcs-2022` Data Integrity proof, using the same Ed25519 key — no second key hierarchy. The proof is generated at issuance and stored, so the public export endpoint never decrypts a private key and never signs with a key that has since been retired. Vocabulary is Open Badges 3.0 with no Certiva-hosted `@context`: a context URL under our control going dark would make every credential already issued impossible to expand. The institution is published as `did:web:<verification-domain>` at `/.well-known/did.json`, with each signing key as a `Multikey`. The DID document is append-only — retired keys stay listed so credentials they signed keep verifying, which means a *leaked* key cannot be disabled by editing it; authoritative key status stays at `/api/institution/public-keys`. Revocation is re-checked on every export request (`410 Gone`), because the exported document itself carries no revocation status.

**Blockchain** - Private key handling is isolated. Known development placeholder keys are rejected in staging and production. Blockchain usage is limited to hash anchoring. No personal data, PDFs, student IDs, or emails are placed on-chain.

**Deletion protections** - Admins with historical activity cannot be deleted, only disabled. The last active OWNER account cannot be deleted, disabled, or demoted.

## Repository Structure

```
apps/api/prisma/schema.prisma   Database schema (Prisma)
apps/api/src/config/            Environment validation (Zod) and app configuration
apps/api/src/common/storage/    StorageService abstraction (local + R2 drivers)
apps/api/src/common/signing/    Ed25519 primitives, at-rest key encryption, per-issuer key lifecycle
apps/api/src/common/vc/         W3C VC / Open Badges claim mapping, eddsa-jcs-2022 proof, did:web document
apps/api/src/modules/           Domain modules: auth, credential, document-proof, admin, audit, verification, institution
apps/api/scripts/               One-time migration and maintenance scripts
apps/api/test/                  e2e specs (require a real PostgreSQL)
apps/web/src/app/               Next.js App Router (dashboard and public verification surfaces)
apps/worker/src/                BullMQ workers: issuance, credential-anchor, retry
scripts/                        Operational scripts (backup)
docker-compose.yml              Local dev PostgreSQL 16 and Redis 7 services
docker-compose.prod.yml         Full self-host stack (web, api, worker, db, redis, migrate)
docs/DEPLOY.md                  Self-host deployment guide
docs/COMPLIANCE.md              Data-protection posture (PII off-chain, retention, audit integrity)
docs/VERIFIABLE-CREDENTIALS.md  W3C VC / did:web export: field mapping, external verification, limits
```

## Scripts Reference

From the monorepo root:

```
pnpm dev        Start all apps in watch mode (Turborepo)
pnpm build      Build all apps
pnpm lint       Lint all apps
pnpm typecheck  tsc --noEmit — api, web, worker, packages/types (not packages/contracts)
pnpm test       Unit tests (jest)
```

Per-app scripts are in each `apps/*/package.json`. The API `dev` script runs `prisma migrate deploy` before starting in watch mode.

`pnpm test` covers unit tests only. The API also has an e2e suite that needs a running PostgreSQL and applied migrations:

```
pnpm --filter api test:e2e
```

## Status

Pre-production / dev phase. Security fundamentals in place (guarded admin routes, rate-limited public verification, upload caps, PII kept off public responses and off-chain, tamper-evident audit, soft-delete evidence retention). Self-host deployment artifacts are provided (see [docs/DEPLOY.md](docs/DEPLOY.md)). Not yet deployed to a production institution.

Environment configuration, infrastructure access, and production secrets are controlled by the project owner.
