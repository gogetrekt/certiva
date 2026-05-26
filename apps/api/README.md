# apps/api

NestJS 11 domain API for Certiva. Owns authentication, RBAC, credential registry, verification, document proof, audit, and storage.

## Role

- Auth: JWT-based login, token version invalidation, `httpOnly` cookie issuance.
- RBAC: Four-tier role hierarchy (OWNER, SUPER_ADMIN, ADMIN, AUDITOR) enforced on every protected route via `RolesGuard` and `PermissionGuard`.
- Credential module: issuance, batch issuance, revocation, public verification, verification logging.
- Document proof module: SHA-256 proof registration, public hash verification, verification logging.
- Admin module: administrator account management with deletion and demotion protections.
- Audit module: append-only audit log covering the full credential and admin lifecycle.
- Health module: liveness and readiness endpoints. Blockchain health requires authentication.
- Storage module: `StorageService` abstraction with pluggable local filesystem and Cloudflare R2 drivers.

## Data layer

- PostgreSQL 16 via Prisma ORM. Schema at `prisma/schema.prisma`.
- Redis 7 via BullMQ for job queues and via `ioredis` for rate limiting.

## Security baseline

- Environment validated at startup via Zod (`src/config/env.schema.ts`). Weak `JWT_SECRET` values and wildcard/empty `CORS_ORIGINS` are rejected in staging and production.
- Rate limiting on auth login, public verification, verification with upload, and admin routes. Redis-backed in staging and production.
- Helmet for HTTP security headers.
- Structured exception filter strips internal stack traces and implementation details from error responses.
- Safe logging -- no JWTs, cookies, passwords, connection strings, or private keys are written to logs.

## Key environment variables

```
DATABASE_URL          PostgreSQL connection URL
REDIS_URL             Redis connection URL
JWT_SECRET            Min 64 characters, non-placeholder
CORS_ORIGINS          Comma-separated origin allowlist (no wildcard in staging/production)
STORAGE_DRIVER        local or r2
PORT                  API port (default 4000)
```

See [../../.env.example](../../.env.example) and [.env.example](.env.example) for the full reference.

## Maintenance scripts

One-time migration and maintenance scripts are in `scripts/`. These are not part of normal operation.
