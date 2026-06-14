import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import * as dotenv from "dotenv";
import path from "path";

const booleanStringSchema = z.union([z.literal("true"), z.literal("false")]);
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: path.resolve(process.cwd(), envFile), quiet: true });

export const env = createEnv({
  server: {
    APP_BASE_URL: z.string().url().optional(),
    DATABASE_URL: z.string().optional(),
    CULTIVAR_READ_DATABASE_URL: z.string().optional(),
    CULTIVAR_READ_SYNC_URL: z.string().optional(),
    CULTIVAR_READ_SYNC_INTERVAL_SECONDS: z.coerce
      .number()
      .positive()
      .optional(),
    TURSO_DATABASE_AUTH_TOKEN: z.string().optional(),
    VERCEL_AUTOMATION_BYPASS_SECRET: z.string().optional(),
    CLERK_SECRET_KEY: z.string().optional(),
    CLERK_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_ID: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_REGION: z.string().optional(),
    AWS_BUCKET_NAME: z.string().optional(),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_PUBLIC_BASE_URL: z.string().url().optional(),
    USE_IMAGE_ASSETS: booleanStringSchema.optional().default("false"),
    NODE_ENV: z.enum(["development", "test", "production"]),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    NEXT_PUBLIC_CLOUDFLARE_URL: z.string(),
    NEXT_PUBLIC_SENTRY_ENABLED: z
      .union([z.literal("true"), z.literal("false")])
      .optional()
      .default("true"),
    NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA: z
      .union([z.literal("true"), z.literal("false")])
      .optional()
      .default("false"),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional().default(""),
    NEXT_PUBLIC_POSTHOG_HOST: z
      .string()
      .optional()
      .default("https://us.i.posthog.com"),
  },
  runtimeEnv: {
    APP_BASE_URL: process.env.APP_BASE_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    CULTIVAR_READ_DATABASE_URL: process.env.CULTIVAR_READ_DATABASE_URL,
    CULTIVAR_READ_SYNC_URL: process.env.CULTIVAR_READ_SYNC_URL,
    CULTIVAR_READ_SYNC_INTERVAL_SECONDS:
      process.env.CULTIVAR_READ_SYNC_INTERVAL_SECONDS,
    TURSO_DATABASE_AUTH_TOKEN: process.env.TURSO_DATABASE_AUTH_TOKEN,
    VERCEL_AUTOMATION_BYPASS_SECRET:
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
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
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
    USE_IMAGE_ASSETS: process.env.USE_IMAGE_ASSETS,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SENTRY_ENABLED: process.env.NEXT_PUBLIC_SENTRY_ENABLED,
    NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA:
      process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

/**
 * @param {string} value
 */
export function isLibsqlDatabaseUrl(value) {
  return value.startsWith("libsql://");
}

/**
 * @param {string} value
 */
export function isFileDatabaseUrl(value) {
  return value.startsWith("file:");
}

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
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  if (
    !isFileDatabaseUrl(env.DATABASE_URL) &&
    !isLibsqlDatabaseUrl(env.DATABASE_URL)
  ) {
    throw new Error(
      "DATABASE_URL must start with file: for local SQLite or libsql:// for Turso.",
    );
  }

  if (isLibsqlDatabaseUrl(env.DATABASE_URL) && !env.TURSO_DATABASE_AUTH_TOKEN) {
    throw new Error(
      "TURSO_DATABASE_AUTH_TOKEN is required for libsql:// DATABASE_URL values.",
    );
  }

  if (
    env.CULTIVAR_READ_DATABASE_URL &&
    !isFileDatabaseUrl(env.CULTIVAR_READ_DATABASE_URL) &&
    !isLibsqlDatabaseUrl(env.CULTIVAR_READ_DATABASE_URL)
  ) {
    throw new Error(
      "CULTIVAR_READ_DATABASE_URL must start with file: for an embedded replica/local SQLite or libsql:// for Turso.",
    );
  }

  if (
    env.CULTIVAR_READ_SYNC_URL &&
    !isLibsqlDatabaseUrl(env.CULTIVAR_READ_SYNC_URL)
  ) {
    throw new Error("CULTIVAR_READ_SYNC_URL must start with libsql://.");
  }

  const hasVercelHost =
    typeof process.env.VERCEL_URL === "string" ||
    typeof process.env.VERCEL_PROJECT_PRODUCTION_URL === "string";

  if (env.NODE_ENV === "production" && !env.APP_BASE_URL && !hasVercelHost) {
    throw new Error(
      "Production requires APP_BASE_URL unless VERCEL_URL or VERCEL_PROJECT_PRODUCTION_URL is available.",
    );
  }
}
