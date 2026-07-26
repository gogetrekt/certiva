# Contributing

## Prerequisites

- Node.js ≥ 20, pnpm 9.12
- Docker (for local PostgreSQL + Redis)

## Setup

```bash
pnpm install
docker compose up -d                 # local Postgres 16 + Redis 7
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env
pnpm --filter api prisma:deploy      # apply migrations
pnpm --filter api prisma:seed        # demo issuer + admin@certiva.local / admin123
pnpm dev                             # all apps in watch mode
```

The `.env.example` files carry development defaults for every required variable,
including `SIGNING_KEY_ENCRYPTION_SECRET` — this encrypts issuer Ed25519 private
keys at rest and the API refuses to boot without it. Do not reuse any of those
development values anywhere real.

Two things you will likely want to change locally:

- `STORAGE_DRIVER` defaults to `r2` in the example, which needs real Cloudflare
  credentials. Set `STORAGE_DRIVER=local` to write credential assets to the
  filesystem instead. (`r2` is enforced only when `NODE_ENV=production` or
  `APP_ENV=staging`, so `local` is fine for development.)
- `BLOCKCHAIN_ENABLED` stays `false` unless you are specifically working on
  anchoring; verification is fully functional without it.

## Before opening a PR

Everything CI enforces must pass locally:

```bash
pnpm lint        # eslint — 0 errors (warnings allowed)
pnpm typecheck   # tsc --noEmit — api, web, worker, packages/types (not packages/contracts)
pnpm test        # jest — unit tests only
pnpm build       # turbo build
```

`pnpm test` does **not** cover the API e2e suite, which needs a real PostgreSQL
with migrations applied (it inserts issuers and credentials, then cleans up after
itself):

```bash
docker compose up -d                 # if not already running
pnpm --filter api prisma:deploy
pnpm --filter api test:e2e           # apps/api/test/*.e2e-spec.ts
```

Run it when touching anything the unit tests cannot reach through mocks —
revocation gating on the VC export (`verification-vc.e2e-spec.ts`) is the current
example: whether a revoked credential actually stops being served depends on a
real query against real rows.

## Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, …).
- **Database changes:** edit `apps/api/prisma/schema.prisma`, then generate a
  migration (`pnpm --filter api prisma:migrate --name <change>`) and commit the
  `apps/api/prisma/migrations/` folder. Never hand-edit an applied migration.
- **Security:** never commit secrets. `.env*` is gitignored (only `.env.example`
  files are tracked). Do not log secrets or student PII. Keep personal data off
  the blockchain — only hashes are anchored (see [docs/COMPLIANCE.md](docs/COMPLIANCE.md)).
- **Audit trail:** the audit log is hash-chained and append-only — do not add
  code paths that update or delete `AuditLog` rows.
- **Signing keys:** issuer Ed25519 private keys must never leave the signing
  provider. Do not add a code path that returns, logs, or serialises
  `privateKeyEncrypted` or its plaintext, and do not sign with a key whose
  `revokedAt` is set.
- **Verifiable Credential export:** the bytes a Data Integrity proof covers are
  not the same bytes as `publicPayload`, and the proof must publish the
  document's `@context`. If you change anything under `apps/api/src/common/vc/`,
  the specs there are the guard — a passing signature round-trip in isolation is
  not enough, external verifiers will reject output that drifts (see
  [docs/VERIFIABLE-CREDENTIALS.md](docs/VERIFIABLE-CREDENTIALS.md)).

## Reporting security issues

Do not open a public issue for vulnerabilities. See the security contact in the
repository settings / SECURITY policy.
