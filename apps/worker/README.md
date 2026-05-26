# apps/worker

TypeScript BullMQ worker process for Certiva. Handles background job processing and blockchain anchoring.

## Role

- Issuance queue: processes credential issuance jobs submitted by the API.
- Credential anchor queue: submits credential hash anchoring transactions to Polygon Amoy when `BLOCKCHAIN_ENABLED=true`.
- Retry queue: handles retry logic for failed jobs.

Queues are backed by Redis via BullMQ. The worker shares the same PostgreSQL database as the API via Prisma.

## Security notes

- The worker does not expose any HTTP endpoints.
- `PRIVATE_KEY` (the blockchain signing key) must be stored in a secrets manager in staging and production. It is never logged.
- The worker uses structured JSON logging (`safeLog`) that does not include secrets, connection strings, or private keys.
- Worker error listeners log error messages only -- not stack traces containing config values.

## Key environment variables

```
REDIS_URL             Redis connection URL (required)
DATABASE_URL          PostgreSQL connection URL (required)
BLOCKCHAIN_ENABLED    true to enable on-chain anchoring
POLYGON_AMOY_RPC_URL  RPC endpoint (required when BLOCKCHAIN_ENABLED=true)
PRIVATE_KEY           0x + 64 hex chars (required when BLOCKCHAIN_ENABLED=true -- store in secret manager)
CONTRACT_ADDRESS      0x + 40 hex chars (required when BLOCKCHAIN_ENABLED=true)
ISSUER_WALLET         0x + 40 hex chars (required when BLOCKCHAIN_ENABLED=true)
```

See [.env.example](.env.example) for the full reference.
