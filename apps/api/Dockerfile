FROM node:20-alpine AS base
RUN npm install -g pnpm@9.12.0

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy manifests first so this layer is cached when only source changes
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/types/package.json     ./packages/types/
COPY packages/config/package.json    ./packages/config/
COPY apps/api/package.json           ./apps/api/

RUN pnpm install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────────────────
# The `builder` stage keeps the full dependency tree (incl. the Prisma CLI), so
# the prod compose reuses it as the one-off `migrate` service.
FROM deps AS builder
WORKDIR /app

# prisma.config.js requires DATABASE_URL to be set even for `generate`/`build`
# (it never connects at this stage). The real URL is injected at runtime.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY turbo.json ./

RUN pnpm --filter api prisma:generate
RUN pnpm turbo run build --filter=api...

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9.12.0
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy the whole built workspace. pnpm's nested node_modules + the generated
# Prisma client are already correctly wired in the builder, so cherry-picking is
# fragile — a wholesale copy is the robust choice for a self-host image.
# ponytail: ~1.75GB (carries devDeps + build toolchain). Fine for single-tenant
# self-host; if image size matters, switch to `pnpm --filter api deploy --prod`
# to emit a flat production-only node_modules.
COPY --from=builder /app ./

EXPOSE 4000
WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
