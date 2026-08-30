# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

FROM base AS dependencies

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY apps/storefront/package.json ./apps/storefront/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/storefront-contract/package.json ./packages/storefront-contract/package.json
COPY packages/ui/package.json ./packages/ui/package.json

RUN pnpm install --frozen-lockfile --filter @daylily-catalog/storefront...

RUN mkdir --parents /runtime-dependencies \
    && cp --archive --dereference \
      /app/packages/storefront-contract/node_modules/zod \
      /runtime-dependencies/zod

FROM base AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/storefront/node_modules ./apps/storefront/node_modules
COPY --from=dependencies /app/packages/storefront-contract/node_modules ./packages/storefront-contract/node_modules
COPY --from=dependencies /app/packages/ui/node_modules ./packages/ui/node_modules
COPY . .

ENV NODE_ENV=production

RUN pnpm --filter @daylily-catalog/storefront build

FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/public ./apps/storefront/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/scripts/production-startup-preflight.mjs ./apps/storefront/scripts/production-startup-preflight.mjs
COPY --from=builder --chown=nextjs:nodejs /app/packages/storefront-contract/src/runtime.js ./packages/storefront-contract/src/runtime.js
COPY --from=dependencies --chown=nextjs:nodejs /runtime-dependencies/zod ./node_modules/zod

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e 'fetch("http://127.0.0.1:3000/api/health").then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))'

CMD ["sh", "-c", "node apps/storefront/scripts/production-startup-preflight.mjs && exec node apps/storefront/server.js"]
