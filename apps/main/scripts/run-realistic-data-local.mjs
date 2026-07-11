#!/usr/bin/env node

import { spawn } from "node:child_process";
import * as dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

const appRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");
const databasePath = path.join(
  appRoot,
  "local",
  "realistic-data",
  "realistic-data.sqlite",
);
const localPort = process.env.REALISTIC_DATA_LOCAL_PORT ?? "3012";

for (const envPath of [
  path.join(repoRoot, ".env.development"),
  path.join(appRoot, ".env.development"),
]) {
  if (existsSync(envPath)) dotenv.config({ path: envPath, quiet: true });
}

function assertTestEnvironment() {
  const requiredPrefixes = [
    ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_"],
    ["CLERK_SECRET_KEY", "sk_test_"],
    ["STRIPE_SECRET_KEY", "sk_test_"],
  ];
  for (const [name, prefix] of requiredPrefixes) {
    if (!(process.env[name] ?? "").startsWith(prefix)) {
      throw new Error(`${name} must begin with ${prefix}.`);
    }
  }
}

if (!existsSync(databasePath)) {
  throw new Error(
    "The realistic-data snapshot is missing. Run `pnpm realistic-data:prepare` first.",
  );
}
assertTestEnvironment();

const child = spawn(
  "pnpm",
  [
    "exec",
    "next",
    "dev",
    "--turbopack",
    "--hostname",
    "localhost",
    "--port",
    localPort,
  ],
  {
    cwd: appRoot,
    env: {
      ...process.env,
      APP_BASE_URL: `http://localhost:${localPort}`,
      DATABASE_URL: `file:${databasePath}`,
      PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS: "0",
      TURSO_DATABASE_AUTH_TOKEN: "",
      TURSO_EMBEDDED_REPLICA_URL: "",
      TURSO_EMBEDDED_REPLICA_SYNC_INTERVAL_SECONDS: "",
      TURSO_EMBEDDED_REPLICA_SYNC_URL: "",
      AWS_ACCESS_KEY_ID: "",
      AWS_SECRET_ACCESS_KEY: "",
      AWS_REGION: "",
      AWS_BUCKET_NAME: "",
      R2_ACCOUNT_ID: "",
      R2_ACCESS_KEY_ID: "",
      R2_SECRET_ACCESS_KEY: "",
      R2_BUCKET_NAME: "",
      SENTRY_AUTH_TOKEN: "",
      NEXT_PUBLIC_SENTRY_ENABLED: "false",
      NEXT_PUBLIC_POSTHOG_KEY: "",
      OPENAI_IMAGE_MODERATION_API_KEY: "",
      IMAGE_MODERATION_ENFORCED: "false",
    },
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 0;
});
