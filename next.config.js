/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

import { withSentryConfig } from "@sentry/nextjs";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [{ hostname: "daylilycatalog.com" }],
  },

  // Add redirects for legacy URLs
  async redirects() {
    return [
      {
        source: "/users/:userId",
        destination: "/:userId",
        permanent: true,
      },
      {
        // Catalog redirects will be handled dynamically in middleware
        // This is a fallback for search engines
        source: "/catalog/:listingId",
        destination: "/api/legacy-redirect?listingId=:listingId",
        permanent: true,
      },
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
  serverExternalPackages: [
    "@prisma/instrumentation",
    "@opentelemetry/instrumentation",
    "require-in-the-middle",
  ],
};

// Only apply Sentry config if it's enabled
const isSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "false";

// Apply Sentry configuration conditionally
export default isSentryEnabled
  ? withSentryConfig(config, {
      // For all available options, see:
      // https://www.npmjs.com/package/@sentry/webpack-plugin#options

      org: "makon-dev",
      project: "new-daylily-catalog",

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      // This can increase your server load as well as your hosting bill.
      // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
      // side errors will fail.
      // tunnelRoute: "/monitoring",

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,

      // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
      // See the following for more information:
      // https://docs.sentry.io/product/crons/
      // https://vercel.com/docs/cron-jobs
      automaticVercelMonitors: true,
    })
  : config;
