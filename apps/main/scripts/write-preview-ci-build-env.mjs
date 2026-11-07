import { writeFileSync } from "node:fs";
import path from "node:path";

// The bootstrap token must not flow into anything that consumes the build env.
delete process.env.OP_SERVICE_ACCOUNT_TOKEN;
/** @param {string} name */
const required = (name) => {
  const value = process.env[name];
  if (!value || /[\r\n]/.test(value))
    throw new Error(`Missing or invalid ${name}.`);
  return value;
};
const databaseUrl = required("BUILD_DATABASE_URL");
if (
  databaseUrl !==
  "libsql://seeded-daylily-catalog-makoncline.aws-us-east-1.turso.io"
) {
  throw new Error("Preview build must use the expected preview database.");
}
const stripeKey = required("STRIPE_SECRET_KEY");
if (!stripeKey.startsWith("sk_test_"))
  throw new Error("Preview builds require a Stripe test key.");
const entries = {
  APP_BASE_URL: required("BUILD_APP_BASE_URL"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: required("BUILD_CLERK_PUBLISHABLE_KEY"),
  NEXT_PUBLIC_CLOUDFLARE_URL: required("BUILD_CLOUDFLARE_URL"),
  NEXT_PUBLIC_SENTRY_ENABLED:
    process.env.BUILD_NEXT_PUBLIC_SENTRY_ENABLED ?? "",
  SENTRY_ENVIRONMENT: "preview",
  NEXT_PUBLIC_POSTHOG_KEY: process.env.BUILD_NEXT_PUBLIC_POSTHOG_KEY ?? "",
  NEXT_PUBLIC_POSTHOG_HOST: process.env.BUILD_NEXT_PUBLIC_POSTHOG_HOST ?? "",
  DATABASE_URL: databaseUrl,
  TURSO_DATABASE_AUTH_TOKEN: required("PREVIEW_SEED_TURSO_AUTH_TOKEN"),
  STRIPE_SECRET_KEY: stripeKey,
  SENTRY_SOURCEMAPS_DISABLED: "1",
};
for (const [key, value] of Object.entries(entries)) {
  if (/[\r\n]/.test(value)) throw new Error(`Invalid value for ${key}.`);
}
const output = path.join(required("RUNNER_TEMP"), "daylilycatalog-build.env");
writeFileSync(
  output,
  Object.entries(entries)
    .map(([key, value]) => `${key}=${value}\n`)
    .join(""),
  { mode: 0o600, flag: "wx" },
);
