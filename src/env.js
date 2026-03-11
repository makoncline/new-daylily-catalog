import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import * as dotenv from "dotenv";
import path from "path";

const booleanStringSchema = z.union([z.literal("true"), z.literal("false")]);

// Load the appropriate .env file before creating env
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: path.resolve(process.cwd(), envFile), quiet: true });

const useTursoDbDefault =
  process.env.NODE_ENV === "production" ? "true" : "false";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    USE_TURSO_DB: booleanStringSchema.optional().default(useTursoDbDefault),
    LOCAL_DATABASE_URL: z.string().optional(),
    TURSO_DATABASE_URL: z.string().optional(),
    TURSO_DATABASE_AUTH_TOKEN: z.string().optional(),
    CLERK_SECRET_KEY: z.string().optional(),
    CLERK_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_ID: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_REGION: z.string().optional(),
    AWS_BUCKET_NAME: z.string().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    NEXT_PUBLIC_CLOUDFLARE_URL: z.string(),
    NEXT_PUBLIC_SENTRY_ENABLED: z
      .union([z.literal("true"), z.literal("false")])
      .optional()
      .default("true"),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional().default(""),
    NEXT_PUBLIC_POSTHOG_HOST: z
      .string()
      .optional()
      .default("https://us.i.posthog.com"),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    USE_TURSO_DB: process.env.USE_TURSO_DB,
    LOCAL_DATABASE_URL: process.env.LOCAL_DATABASE_URL,
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
    TURSO_DATABASE_AUTH_TOKEN: process.env.TURSO_DATABASE_AUTH_TOKEN,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLOUDFLARE_URL: process.env.NEXT_PUBLIC_CLOUDFLARE_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SENTRY_ENABLED: process.env.NEXT_PUBLIC_SENTRY_ENABLED,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined.
   * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

export const useTursoDb =
  env.USE_TURSO_DB === "true" ||
  (env.NODE_ENV === "production" && env.USE_TURSO_DB !== "false");

/**
 * @template T
 * @param {string} name
 * @param {T | null | undefined} value
 * @returns {T}
 */
export function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

if (!process.env.SKIP_ENV_VALIDATION) {
  if (useTursoDb) {
    if (!env.TURSO_DATABASE_URL || !env.TURSO_DATABASE_AUTH_TOKEN) {
      throw new Error(
        "USE_TURSO_DB requires TURSO_DATABASE_URL and TURSO_DATABASE_AUTH_TOKEN.",
      );
    }
  } else if (!env.LOCAL_DATABASE_URL) {
    throw new Error("USE_TURSO_DB=false requires LOCAL_DATABASE_URL.");
  }
}
