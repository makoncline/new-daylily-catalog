import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { validateHermeticRuntime } from "../src/lib/hermetic/runtime.js";

const port = process.env.PORT ?? "3200";
const databasePath = path.resolve(
  process.cwd(),
  "tests",
  ".tmp",
  process.env.HERMETIC_DB_NAME ?? "hermetic-local.sqlite",
);
const databaseUrl = `file:${databasePath}`;
const appBaseUrl = `http://localhost:${port}`;

const hermeticEnv: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: "development",
  NODE_OPTIONS: "",
  RUST_LOG: "info",
  HERMETIC_MODE: "1",
  HERMETIC_RUNTIME_ID: databasePath,
  LOCAL_QUERY_LOGGING: "0",
  NEXT_PUBLIC_HERMETIC_MODE: "1",
  APP_BASE_URL: appBaseUrl,
  DATABASE_URL: databaseUrl,
  CLERK_SECRET_KEY: "sk_test_hermetic",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_hermetic",
  STRIPE_SECRET_KEY: "sk_test_hermetic",
  STRIPE_PRICE_ID: "price_hermetic",
  NEXT_PUBLIC_CLOUDFLARE_URL: appBaseUrl,
  NEXT_PUBLIC_SENTRY_ENABLED: "false",
  NEXT_PUBLIC_POSTHOG_KEY: "",
  NEXT_PUBLIC_POSTHOG_HOST: "",
  SENTRY_AUTH_TOKEN: "",
  OPENAI_IMAGE_MODERATION_API_KEY: "",
  IMAGE_MODERATION_ENFORCED: "false",
  TURSO_DATABASE_AUTH_TOKEN: "",
  TURSO_EMBEDDED_REPLICA_URL: "",
};

validateHermeticRuntime({
  nodeEnv: hermeticEnv.NODE_ENV,
  databaseUrl,
  appBaseUrl,
  clerkSecretKey: hermeticEnv.CLERK_SECRET_KEY,
  stripeSecretKey: hermeticEnv.STRIPE_SECRET_KEY,
  appRoot: process.cwd(),
});

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: hermeticEnv,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
for (const file of [
  databasePath,
  `${databasePath}-wal`,
  `${databasePath}-shm`,
]) {
  fs.rmSync(file, { force: true });
}
run("pnpm", ["exec", "prisma", "db", "push"]);
run("node", ["scripts/seed-hermetic-data.ts"]);

console.log(`[hermetic] Starting offline app at ${appBaseUrl}`);
const networkGuardUrl = pathToFileURL(
  path.resolve(process.cwd(), "scripts", "integration-network-guard.mjs"),
).href;
const child: ChildProcess = spawn(
  "pnpm",
  [
    "exec",
    "next",
    "dev",
    "--turbopack",
    "--hostname",
    "localhost",
    "--port",
    port,
  ],
  {
    cwd: process.cwd(),
    env: {
      ...hermeticEnv,
      NODE_OPTIONS: `--import=${networkGuardUrl}`,
    },
    stdio: "inherit",
  },
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code: number | null) => process.exit(code ?? 0));
