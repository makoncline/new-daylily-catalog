/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

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
};

export default config;
