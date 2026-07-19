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

## Before opening a PR

Everything CI enforces must pass locally:

```bash
pnpm lint        # eslint — 0 errors (warnings allowed)
pnpm typecheck   # tsc --noEmit across all packages
pnpm test        # jest
pnpm build       # turbo build
```

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

## Reporting security issues

Do not open a public issue for vulnerabilities. See the security contact in the
repository settings / SECURITY policy.
