# Deploying Certiva (self-host)

Single-node, self-hosted deployment with Docker Compose. The stack runs five
services on one host: **web** (Next.js), **api** (NestJS), **worker** (blockchain
anchoring), **postgres**, and **redis**. A one-off **migrate** step applies the
database schema before the app starts.

```
        ┌─────────┐        ┌──────────────┐
 users →│  web    │──BFF──▶│    api        │──┐
        │ :3000   │        │   :4000/api   │  │
        └─────────┘        └──────────────┘  ├─▶ postgres
                            ┌──────────────┐  │
                            │   worker      │──┤
                            │ (anchor jobs) │  └─▶ redis
                            └──────────────┘
```

## 1. Prerequisites

- A Linux host with **Docker Engine 24+** and the **Docker Compose plugin**
  (`docker compose version`).
- A domain name pointing at the host (e.g. `verify.your-univ.ac.id`).
- A **Cloudflare R2** bucket (S3-compatible) — required for asset storage in
  production. See [Cloudflare R2 docs](https://developers.cloudflare.com/r2/).
- ~2 GB RAM free for the build; ~1 GB to run.

TLS is **not** handled by this stack. Terminate HTTPS at a reverse proxy in
front of it (Caddy, nginx, or Traefik) — see [§6](#6-https--reverse-proxy).
`COOKIE_SECURE=true` requires the app to be reached over HTTPS.

## 2. Configure

```bash
git clone <your-repo> certiva && cd certiva
cp .env.prod.example .env
```

Edit `.env` and fill every value marked **REQUIRED**:

| Variable | What to set |
|---|---|
| `POSTGRES_PASSWORD` | A strong DB password |
| `DATABASE_URL` | Replace `CHANGE_ME` with the same password |
| `JWT_SECRET` | 64+ random chars — `openssl rand -hex 48` |
| `SIGNING_KEY_ENCRYPTION_SECRET` | 32+ random chars — `openssl rand -hex 32`. Encrypts every issuer Ed25519 private key at rest. **Back this up with the same care as the database**: lose it and no stored signing key can be decrypted again. Changing it later requires the re-key runbook in [§5](#5-day-2-operations). |
| `WEB_PUBLIC_BASE_URL`, `API_PUBLIC_BASE_URL`, `CORS_ORIGINS`, `NEXT_PUBLIC_SITE_URL` | Your real domain |
| `STORAGE_DRIVER` | Must be `r2` when `NODE_ENV=production` or `APP_ENV=staging` — the env validation rejects `local` there. `local` is for development only. |
| `R2_*` | Your Cloudflare R2 credentials + bucket |

Placeholder values for `JWT_SECRET` and `SIGNING_KEY_ENCRYPTION_SECRET` (`secret`,
`change-me`, and similar) are rejected at startup outside development, as are an
empty or wildcard `CORS_ORIGINS`. The API refuses to boot rather than run
insecurely, and the error names the offending variable.

`NEXT_PUBLIC_*` values are baked into the web image **at build time**, so if you
change them later you must rebuild `web` (`--build`).

Blockchain anchoring is off by default (`BLOCKCHAIN_ENABLED=false`). To enable it,
set the `POLYGON_AMOY_RPC_URL`, `CONTRACT_ADDRESS`, `ISSUER_WALLET`, and
`PRIVATE_KEY` values.

## 3. Launch

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Order is handled for you: postgres/redis become healthy → `migrate` applies all
pending Prisma migrations and exits → `api`, `worker`, `web` start. First build
takes a few minutes.

Check status and logs:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
```

The API exposes a health check at `GET /api/health`.

## 4. Create the first admin

The seed creates a demo issuer and a super-admin. Run it once:

```bash
docker compose -f docker-compose.prod.yml run --rm migrate pnpm --filter api prisma:seed
```

Default login: **`admin@certiva.local`** / **`admin123`**.

> ⚠️ Change this password immediately after the first login, and rename/replace
> the demo issuer (`certiva.local`) with your institution. Do not run the seed
> on a system that already has real admins — it is for bootstrapping only.

## 5. Day-2 operations

**Update to a new version**

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

New migrations apply automatically via the `migrate` step on each `up`.

**Back up the database** (the only stateful piece besides R2)

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U certiva certiva > backup-$(date +%F).sql
```

**Verify the audit log has not been tampered with** — the audit trail is
hash-chained; this recomputes the chain and reports any break:

```
GET /api/audit/action-logs/verify        (owner / super-admin / auditor)
```

**Replace the institution's verification key** (suspected key exposure, or routine
rotation): Dashboard → Settings → *Institution verification keys* → **Replace
verification key** (OWNER / SUPER_ADMIN). Credentials issued earlier keep
verifying with the retired key — nothing already issued is invalidated. The
change is recorded in the audit trail as `SIGNING_KEY_ROTATED`.

**Change `SIGNING_KEY_ENCRYPTION_SECRET`** — this is the master secret that
encrypts every stored signing private key. Changing it in the environment
*without* re-encrypting first leaves every private key permanently
undecryptable, and the institution can never sign again. Run the re-key script
as part of the change:

```bash
# 1. Back up the database first (see above). Non-negotiable.

# 2. Dry run — validates that every key decrypts with the old secret and
#    round-trips with the new one. Writes nothing.
docker compose -f docker-compose.prod.yml exec api \
  env SIGNING_KEY_ENCRYPTION_SECRET_OLD="<old>" SIGNING_KEY_ENCRYPTION_SECRET="<new>" \
  npx tsx scripts/rekey-signing-secret.ts

# 3. Apply once the counts look right.
docker compose -f docker-compose.prod.yml exec api \
  env SIGNING_KEY_ENCRYPTION_SECRET_OLD="<old>" SIGNING_KEY_ENCRYPTION_SECRET="<new>" \
  npx tsx scripts/rekey-signing-secret.ts --apply

# 4. Put the new value in .env (drop the old one) and restart.
docker compose -f docker-compose.prod.yml up -d

# 5. Verify before deleting the backup: issue one credential (proves signing
#    works with the new secret) and verify one pre-existing credential (proves
#    old keys were re-encrypted, not corrupted).
```

The script is safe to re-run: rows already readable with the new secret are
skipped, so an interrupted run can simply be repeated. It aborts without writing
if any key fails to decrypt or fails to match its stored public key.

**Backfilling W3C VC proofs after upgrading**

The VC export stores its Data Integrity proof on the credential row at issuance.
Credentials issued *before* the upgrade have no proof and will return `404` from
`/api/verification/:id/vc` until backfilled. Run this once, after migrations:

```bash
# Dry run first. NOTE the flag polarity is the opposite of the re-key script
# above: this one WRITES by default, and --dry-run is what makes it read-only.
docker compose -f docker-compose.prod.yml exec api \
  npx tsx scripts/backfill-vc-proof.ts --dry-run

docker compose -f docker-compose.prod.yml exec api \
  npx tsx scripts/backfill-vc-proof.ts
```

Safe to re-run: credentials that already have a proof are skipped. Credentials
whose signing key has since been **revoked** are skipped and listed by design —
signing new material with a retired key would defeat the point of retiring it.
Those credentials keep verifying through `/proof`; they simply have no VC export.
Each proof is verified against its own public key before being written.

**Verify the `did:web` document (mandatory, first deploy only)**

`did:web` resolvers fetch `https://<domain>/.well-known/did.json`. That path is
served by the `web` container through a `rewrites()` entry in `next.config.ts`,
which has been exercised in development but **not yet verified against a
production standalone build** — treat it as unconfirmed until you have checked it
on your own deployment:

```bash
curl -sS https://verify.your-univ.ac.id/.well-known/did.json | head -20
```

Expect a JSON document whose `id` is `did:web:verify.your-univ.ac.id` and whose
`verificationMethod` lists your signing keys as `Multikey` entries. A 404 here
means the rewrite is not active in the production build; the underlying data is
still reachable at `/api/institution/did.json`, and a proxy-level rewrite from
`/.well-known/did.json` to that path is a valid fallback. Without this working,
the VC export is still cryptographically valid but external verifiers cannot
resolve the issuer's keys.

**Stop / restart**

```bash
docker compose -f docker-compose.prod.yml down       # stop (keeps volumes/data)
docker compose -f docker-compose.prod.yml down -v     # ⚠️ also deletes DB + redis data
```

## 6. HTTPS / reverse proxy

Point your proxy at the `web` container (`:3000`) and let it handle TLS. The API
is only reached by the web BFF over the internal Docker network, so it does not
need to be exposed publicly. Minimal Caddy example:

```
verify.your-univ.ac.id {
    reverse_proxy localhost:3000
}
```

If you must expose the API directly (e.g. for external integrations),
uncomment the `ports` block on the `api` service in `docker-compose.prod.yml`
and proxy `/api` to `localhost:4000`.

## 7. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `migrate` exits non-zero | `DATABASE_URL` wrong, or Postgres not healthy — check `logs postgres` |
| API boots then crashes | A REQUIRED env var missing/invalid (`JWT_SECRET` < 64 chars, `SIGNING_KEY_ENCRYPTION_SECRET` < 32 chars or placeholder, `STORAGE_DRIVER=local` in production, R2 unset) — the error names the field |
| Login works but session drops | Serving over HTTP with `COOKIE_SECURE=true` — put HTTPS in front or set it `false` for local testing only |
| Web shows wrong domain in links | `NEXT_PUBLIC_SITE_URL` changed without rebuilding `web` |
| Anchor jobs never run | `BLOCKCHAIN_ENABLED=false`, or worker can't reach `REDIS_URL` |
| Signing or key rotation fails after an env change | `SIGNING_KEY_ENCRYPTION_SECRET` was changed without running the re-key script (§5) — restore the old value and re-key properly |
| `/.well-known/did.json` returns 404 | The Next.js rewrite is not active in this build — see §5, and fall back to a proxy rewrite onto `/api/institution/did.json` |
| `/verification/:id/vc` returns 404 | Credential predates the VC export and has no stored proof — run the backfill (§5) |
| `/verification/:id/vc` returns 410 | Working as intended: the credential is revoked or soft-deleted |
