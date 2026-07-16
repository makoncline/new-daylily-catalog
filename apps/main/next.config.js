/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */

import { withSentryConfig } from "@sentry/nextjs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateIntegrationRuntime } from "./scripts/integration-network-guard.mjs";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const integrationMode = process.env.INTEGRATION_MODE === "1";

if (integrationMode) {
  validateIntegrationRuntime({
    appRoot: appDir,
    nodeEnv: process.env.NODE_ENV,
    integrationMode: process.env.INTEGRATION_MODE,
    appBaseUrl: process.env.APP_BASE_URL,
    databaseUrl: process.env.DATABASE_URL,
    env: process.env,
  });
}

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  outputFileTracingRoot: path.join(appDir, "../.."),
  serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3"],
  cacheMaxMemorySize: 0,

  images: {
    remotePatterns: [{ hostname: "daylilycatalog.com" }],
    qualities: [75],
  },

  devIndicators: {
    position: "bottom-right",
  },

  ...(integrationMode
    ? {
        turbopack: {
          resolveAlias: {
            "@clerk/nextjs": "./tests/integration/clerk-client.tsx",
            "@clerk/nextjs/server": "./tests/integration/clerk-server.ts",
          },
        },
      }
    : {}),

  // Add redirects for legacy URLs
  async redirects() {
    return [
      {
        source: "/users",
        destination: "/catalogs",
        permanent: true,
      },
      {
        source: "/sitemap",
        destination: "/sitemap.xml",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Link",
            value:
              '</.well-known/api-catalog>; rel="api-catalog", </openapi.json>; rel="service-desc", </llms.txt>; rel="service-doc", </llms-full.txt>; rel="describedby", </.well-known/agent-skills/index.json>; rel="describedby", </sitemap.xml>; rel="describedby"',
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(config, {
  org: "makon-dev",
  project: "new-daylily-catalog",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Keep source map uploads scoped to the default client files to avoid slower Vercel builds.
  widenClientFileUpload: false,
  sourcemaps: {
    disable: process.env.SENTRY_SOURCEMAPS_DISABLED === "1",
  },
});
