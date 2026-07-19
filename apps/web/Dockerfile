FROM node:20-alpine AS base
RUN npm install -g pnpm@9.12.0

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json  ./packages/types/
COPY packages/ui/package.json     ./packages/ui/
COPY packages/config/package.json ./packages/config/
COPY apps/web/package.json        ./apps/web/

RUN pnpm install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
COPY turbo.json ./

# NEXT_PUBLIC_* values are inlined at build time, so they must be supplied here.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPPORT_EMAIL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPPORT_EMAIL=$NEXT_PUBLIC_SUPPORT_EMAIL
ENV NODE_ENV=production

RUN pnpm turbo run build --filter=web...

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone output: self-contained server + traced node_modules.
COPY --from=builder /app/apps/web/.next/standalone/ ./
COPY --from=builder /app/apps/web/.next/static/     ./apps/web/.next/static/
COPY --from=builder /app/apps/web/public/           ./apps/web/public/

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
