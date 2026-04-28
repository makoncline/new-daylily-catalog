# syntax=docker/dockerfile:1.7

FROM node:20-bullseye-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/main/package.json ./apps/main/package.json
COPY apps/main/prisma ./apps/main/prisma

RUN pnpm install --frozen-lockfile --filter @daylily-catalog/main...

FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/main/node_modules ./apps/main/node_modules
COPY . .

ENV NODE_ENV=production
ARG BUILD_ENV_FINGERPRINT

RUN --mount=type=secret,id=app_env \
    : "${BUILD_ENV_FINGERPRINT:?BUILD_ENV_FINGERPRINT is required for Docker builds}" \
    && printf '%s' "$BUILD_ENV_FINGERPRINT" >/dev/null \
    && set -a \
    && . /run/secrets/app_env \
    && set +a \
    && : "${APP_BASE_URL:?APP_BASE_URL is required for Docker builds}" \
    && export NODE_ENV=production \
    && pnpm --filter @daylily-catalog/main exec next build

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs \
    && mkdir -p /data \
    && chown -R nextjs:nodejs /app /data

COPY --from=builder --chown=nextjs:nodejs /app/apps/main/public ./apps/main/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/main/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/main/.next/static ./apps/main/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/main/server.js"]
