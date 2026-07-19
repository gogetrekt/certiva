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
| `WEB_PUBLIC_BASE_URL`, `API_PUBLIC_BASE_URL`, `CORS_ORIGINS`, `NEXT_PUBLIC_SITE_URL` | Your real domain |
| `R2_*` | Your Cloudflare R2 credentials + bucket |

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
| API boots then crashes | A REQUIRED env var missing/invalid (JWT_SECRET < 64 chars, R2 unset) — the error names the field |
| Login works but session drops | Serving over HTTP with `COOKIE_SECURE=true` — put HTTPS in front or set it `false` for local testing only |
| Web shows wrong domain in links | `NEXT_PUBLIC_SITE_URL` changed without rebuilding `web` |
| Anchor jobs never run | `BLOCKCHAIN_ENABLED=false`, or worker can't reach `REDIS_URL` |
