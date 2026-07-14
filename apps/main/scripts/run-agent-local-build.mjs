#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import * as dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

const appRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");
const timeoutSeconds = Number(process.env.AGENT_BUILD_TIMEOUT_SECONDS ?? "180");
for (const envPath of [
  path.join(repoRoot, ".env.development"),
  path.join(appRoot, ".env.development"),
]) {
  if (existsSync(envPath)) dotenv.config({ path: envPath, quiet: true });
}

const result = spawnSync("pnpm", ["exec", "next", "build"], {
  cwd: appRoot,
  stdio: "inherit",
  timeout: timeoutSeconds * 1_000,
  env: {
    ...process.env,
    NODE_ENV: "production",
    SENTRY_AUTH_TOKEN: "",
    NEXT_PUBLIC_SENTRY_ENABLED: "false",
    NEXT_PUBLIC_POSTHOG_KEY: "",
    OPENAI_IMAGE_MODERATION_API_KEY: "",
  },
});
if (result.error?.code === "ETIMEDOUT") {
  throw new Error(
    `Local agent build exceeded ${timeoutSeconds}s. Set AGENT_BUILD_TIMEOUT_SECONDS to change the bounded wait.`,
  );
}
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
