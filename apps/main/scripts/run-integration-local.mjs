import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  FORBIDDEN_SERVICE_ENV,
  removeIntegrationDatabaseFiles,
  validateIntegrationRuntime,
} from "./integration-network-guard.mjs";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const port = process.env.INTEGRATION_PORT ?? "3210";
const appBaseUrl = `http://localhost:${port}`;
const runId = `${process.pid}-${crypto.randomUUID()}`;
const databasePath = path.join(
  appRoot,
  "tests",
  ".tmp",
  `integration-${runId}.sqlite`,
);
const databaseUrl = `file:${databasePath}`;
const guardUrl = pathToFileURL(
  path.join(appRoot, "scripts", "integration-network-guard.mjs"),
).href;

/** @type {NodeJS.ProcessEnv} */
const integrationEnv = {
  ...process.env,
  NODE_ENV: "development",
  INTEGRATION_MODE: "1",
  INTEGRATION_NETWORK_GUARD: "1",
  APP_BASE_URL: appBaseUrl,
  INTEGRATION_PROVIDER_URL: "http://127.0.0.1:3211",
  DATABASE_URL: databaseUrl,
  CLERK_SECRET_KEY: "sk_test_integration",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_integration",
  STRIPE_SECRET_KEY: "sk_test_integration",
  STRIPE_PRICE_ID: "price_integration",
  NEXT_PUBLIC_CLOUDFLARE_URL: appBaseUrl,
  NEXT_PUBLIC_SENTRY_ENABLED: "false",
  IMAGE_MODERATION_ENFORCED: "false",
  USE_IMAGE_ASSETS: "false",
  USE_GENERATED_CULTIVAR_IMAGE_ASSETS: "false",
  PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS: "0",
  RUST_LOG: "info",
  NODE_OPTIONS: `--import=${guardUrl}`,
};

for (const name of FORBIDDEN_SERVICE_ENV) integrationEnv[name] = "";

validateIntegrationRuntime({
  appRoot,
  nodeEnv: integrationEnv.NODE_ENV,
  integrationMode: integrationEnv.INTEGRATION_MODE,
  appBaseUrl,
  databaseUrl,
  env: integrationEnv,
});

let activeChild;
let forwardedSignal;

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: appRoot,
      env: {
        ...integrationEnv,
        INTEGRATION_NETWORK_GUARD: "0",
        NODE_OPTIONS: "",
      },
      stdio: "inherit",
    });
    activeChild = child;
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      activeChild = undefined;
      if (signal) reject(new Error(`${command} exited from ${signal}.`));
      else resolve(code ?? 1);
    });
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    forwardedSignal = signal;
    activeChild?.kill(signal);
  });
}

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
removeIntegrationDatabaseFiles(databaseUrl);

let exitCode = 1;
try {
  exitCode = await run(path.join(appRoot, "node_modules", ".bin", "prisma"), [
    "db",
    "push",
  ]);
  if (exitCode !== 0)
    throw new Error("Failed to prepare integration database.");

  exitCode = await run(process.execPath, [
    path.join(appRoot, "scripts", "seed-integration-data.mjs"),
    databaseUrl,
  ]);
  if (exitCode !== 0) throw new Error("Failed to seed integration database.");

  const specs = process.argv.slice(2);
  exitCode = await run(
    path.join(appRoot, "node_modules", ".bin", "playwright"),
    ["test", "--config", "playwright.integration.config.ts", ...specs],
  );
} finally {
  removeIntegrationDatabaseFiles(databaseUrl);
}

if (forwardedSignal) process.kill(process.pid, forwardedSignal);
process.exitCode = exitCode;
