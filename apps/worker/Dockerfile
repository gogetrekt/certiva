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

# `apps/api` generates the Prisma Client from this schema in its `postinstall`,
# which is no longer allowed to fail, so the schema must exist before install.
COPY apps/api/prisma/ ./apps/api/prisma/

RUN pnpm install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

# Copy all source
COPY packages/ ./packages/
COPY apps/worker/src/ ./apps/worker/src/
COPY apps/worker/tsconfig*.json ./apps/worker/
COPY turbo.json ./

# Generate the Prisma Client. Deliberately not `|| true`: a worker image without
# a Prisma Client cannot run a single job, so a failure here has to stop the
# build instead of producing a broken image.
RUN pnpm --filter worker prisma:generate

# Build packages then worker (turbo respects dependsOn: ["^build"])
RUN pnpm turbo run build --filter=worker...

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9.12.0
WORKDIR /app

ENV NODE_ENV=production

# Copy the whole built workspace, same as apps/api/Dockerfile. Cherry-picking
# the Prisma client used to fail the build outright: under pnpm the generated
# client lives in `node_modules/.pnpm/@prisma+client@<version>_.../`, so
# `/app/node_modules/.prisma` never exists and `COPY` aborted with "file does
# not exist". Re-running `pnpm install --prod` here also re-linked
# `node_modules`, and `--ignore-scripts` plus the absent schema left no way to
# regenerate the client in this stage.
# ponytail: carries devDeps + build toolchain, same trade-off the api image
# already accepts; switch to `pnpm --filter worker deploy --prod` if image size
# starts to matter.
COPY --from=builder /app ./

WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]
