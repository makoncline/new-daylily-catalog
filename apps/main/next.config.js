/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */

import { withSentryConfig } from "@sentry/nextjs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const hermeticMode = process.env.HERMETIC_MODE === "1";
/** @type {Record<string, string>} */
const hermeticAliases = {};
if (hermeticMode) {
  hermeticAliases["@clerk/nextjs"] = "./src/lib/hermetic/clerk-client.tsx";
  hermeticAliases["@clerk/nextjs/server"] =
    "./src/lib/hermetic/clerk-server.ts";
}

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  outputFileTracingRoot: path.join(appDir, "../.."),
  cacheMaxMemorySize: 0,

  turbopack: {
    resolveAlias: hermeticAliases,
  },

  webpack(webpackConfig) {
    const webpackHermeticAliases = Object.fromEntries(
      Object.entries(hermeticAliases).map(([name, target]) => [
        name,
        path.resolve(appDir, target),
      ]),
    );
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      ...webpackHermeticAliases,
    };
    return webpackConfig;
  },

  images: {
    remotePatterns: [{ hostname: "daylilycatalog.com" }],
    qualities: [75],
  },

  devIndicators: {
    position: "bottom-right",
  },

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
