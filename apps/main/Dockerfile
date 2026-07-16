# syntax=docker/dockerfile:1.7

FROM node:20-bullseye-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates sqlite3 \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY apps/main/package.json ./apps/main/package.json
COPY packages/standalone-runtime/package.json ./packages/standalone-runtime/package.json
COPY apps/main/prisma ./apps/main/prisma

RUN pnpm install --frozen-lockfile \
    --filter @daylily-catalog/main... \
    --filter @daylily-catalog/standalone-runtime...

FROM deps AS runtime-deps

RUN pnpm --filter @daylily-catalog/standalone-runtime --prod deploy /runtime \
    && source_modules="$(dirname "$(dirname "$(readlink -f /app/apps/main/node_modules/@prisma/client)")")" \
    && runtime_modules="$(dirname "$(dirname "$(readlink -f /runtime/node_modules/@prisma/client)")")" \
    && cp -a "$source_modules/.prisma" "$runtime_modules/.prisma"

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
COPY --from=builder --chown=nextjs:nodejs /app/apps/main/scripts/build-public-search-index.mjs ./apps/main/scripts/build-public-search-index.mjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/main/scripts/build-public-parentage-index.mjs ./apps/main/scripts/build-public-parentage-index.mjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/main/.next/standalone ./
COPY --from=runtime-deps --chown=nextjs:nodejs /runtime/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/main/.next/static ./apps/main/.next/static

RUN node -e 'const { execFileSync } = require("node:child_process"); const { createRequire } = require("node:module"); void (async () => { const serverRequire = createRequire("/app/apps/main/server.js"); for (const dependency of ["@aws-sdk/client-s3", "@prisma/client", "@prisma/adapter-libsql", "@libsql/client"]) serverRequire(dependency); const sharp = serverRequire("sharp"); await sharp({ create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).webp().toBuffer(); const sharpAddon = Object.keys(require.cache).find((modulePath) => modulePath.endsWith(".node") && modulePath.includes("sharp")); if (!sharpAddon) throw new Error("Loaded Sharp native addon was not found."); const sharpLdd = execFileSync("ldd", [sharpAddon], { encoding: "utf8" }); process.stdout.write(sharpLdd); if (sharpLdd.includes("not found")) process.exit(1); })().catch((error) => { console.error(error); process.exit(1); })'

USER nextjs

EXPOSE 3000

CMD ["node", "apps/main/server.js"]
