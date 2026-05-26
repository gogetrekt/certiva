#!/usr/bin/env bash
# backup.sh — Certiva staging backup helper
#
# PostgreSQL backup (run from the host; Docker postgres container must be running)
#
#   bash scripts/backup.sh db
#
# Redis note:
#   BullMQ jobs are ephemeral — running jobs will retry on restart.
#   If you need to preserve queued jobs, stop the worker first, then snapshot:
#
#   docker exec certiva-redis redis-cli BGSAVE
#   # Dump file: $(docker inspect --format '{{(index .Mounts 0).Source}}' certiva-redis)/dump.rdb
#
# Asset backup:
#   When STORAGE_DRIVER=local: copy the storage/ directory.
#   When STORAGE_DRIVER=r2   : R2 is durable (11 nines). Use `rclone` or
#                               Cloudflare's Dashboard > R2 > Bucket > Download
#                               for additional local copies.
#
# Restore example (database):
#   docker exec -i <postgres-container> psql -U <user> -d <db> < backup.sql

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

# ── PostgreSQL ────────────────────────────────────────────────────────────────
backup_db() {
  echo "==> PostgreSQL backup"

  # Read connection from env
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "DATABASE_URL is not set. Export it before running this script."
    exit 1
  fi

  # Extract components from postgresql://user:pass@host:port/db?params
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
  DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|postgresql://[^:]*:\([^@]*\)@.*|\1|p')
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\)[:/].*|\1|p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

  DB_PORT="${DB_PORT:-5432}"
  OUTFILE="${BACKUP_DIR}/certiva_db_${TIMESTAMP}.sql"

  PGPASSWORD="$DB_PASS" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    -f "$OUTFILE"

  echo "    Saved: $OUTFILE"
  echo "    Restore: psql -h HOST -U USER -d DB < $OUTFILE"
}

# ── Local asset backup ────────────────────────────────────────────────────────
backup_assets() {
  ASSET_ROOT="${ASSET_STORAGE_ROOT:-storage}"
  if [[ ! -d "$ASSET_ROOT" ]]; then
    echo "==> No local asset directory found at $ASSET_ROOT — skipping"
    return
  fi
  echo "==> Local asset backup"
  OUTFILE="${BACKUP_DIR}/certiva_assets_${TIMESTAMP}.tar.gz"
  tar -czf "$OUTFILE" -C "$(dirname "$ASSET_ROOT")" "$(basename "$ASSET_ROOT")"
  echo "    Saved: $OUTFILE"
}

# ── Dispatch ──────────────────────────────────────────────────────────────────
CMD="${1:-all}"
case "$CMD" in
  db)     backup_db ;;
  assets) backup_assets ;;
  all)    backup_db; backup_assets ;;
  *)
    echo "Usage: $0 [db|assets|all]"
    exit 1
    ;;
esac

echo "Done."
