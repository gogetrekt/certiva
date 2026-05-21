FROM node:20-alpine AS base
RUN npm install -g pnpm@9.12.0

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy manifests first so layer is cached when only source changes
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/types/package.json     ./packages/types/
COPY packages/config/package.json    ./packages/config/
COPY apps/api/package.json           ./apps/api/
COPY apps/worker/package.json        ./apps/worker/

RUN pnpm install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

# Copy all source
COPY packages/ ./packages/
COPY apps/api/prisma/ ./apps/api/prisma/
COPY apps/worker/src/ ./apps/worker/src/
COPY apps/worker/tsconfig*.json ./apps/worker/
COPY turbo.json ./

# Generate Prisma client
RUN pnpm prisma generate || true

# Build packages then worker (turbo respects dependsOn: ["^build"])
RUN pnpm turbo run build --filter=worker...

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9.12.0
WORKDIR /app

ENV NODE_ENV=production

# Copy workspace structure needed at runtime
COPY --from=builder /app/pnpm-workspace.yaml   ./
COPY --from=builder /app/package.json          ./
COPY --from=builder /app/pnpm-lock.yaml        ./
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/
COPY --from=builder /app/packages/contracts/dist/        ./packages/contracts/dist/
COPY --from=builder /app/packages/types/package.json     ./packages/types/
COPY --from=builder /app/packages/types/dist/            ./packages/types/dist/
COPY --from=builder /app/apps/worker/package.json        ./apps/worker/
COPY --from=builder /app/apps/worker/dist/               ./apps/worker/dist/

# Prisma client (query engine + generated client)
COPY --from=builder /app/node_modules/.prisma/ ./node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma/ ./node_modules/@prisma/

# Install production deps only (no devDeps, no scripts)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]
