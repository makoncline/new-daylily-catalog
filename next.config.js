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
        permanent: true, // 301 redirect for SEO
      },
      {
        // Catalog redirects will be handled dynamically in middleware
        // This is a fallback for search engines
        source: "/catalog/:listingId",
        destination: "/api/legacy-redirect?listingId=:listingId",
        permanent: true, // 301 redirect for SEO
      },
    ];
  },

  // Configure Sentry
  sentry: {
    // Hide source maps from the client
    hideSourceMaps: true,
    // Disable the build-time error detection to avoid spamming the console
    disableServerWebpackPlugin:
      process.env.NEXT_PUBLIC_SENTRY_ENABLED === "false",
    disableClientWebpackPlugin:
      process.env.NEXT_PUBLIC_SENTRY_ENABLED === "false",
  },
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
      // tunnelRoute: "/monitoring",

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,

      // Enables automatic instrumentation of Vercel Cron Monitors.
      automaticVercelMonitors: true,
    })
  : config;
