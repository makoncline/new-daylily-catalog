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
import { startEvidence } from "./integration-evidence.mjs";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const args = process.argv.slice(2);
const recording = args[0] === "--evidence";
const specs = recording ? args.slice(1) : args;
const port = Number(process.env.INTEGRATION_PORT ?? "3210");
if (!Number.isInteger(port) || port < 1 || port >= 65535) {
  throw new Error("INTEGRATION_PORT must be a port from 1 to 65534.");
}
const appBaseUrl = `http://localhost:${port}`;
const providerUrl = `http://127.0.0.1:${port + 1}`;
const runId = `${process.pid}-${crypto.randomUUID()}`;
const databasePath = path.join(
  appRoot,
  "tests",
  ".tmp",
  `integration-${runId}.sqlite`,
);
const databaseUrl = `file:${databasePath}`;
const runtimeFlagsPath =
  process.env.RUNTIME_FEATURE_FLAGS_PATH ??
  path.join(appRoot, "tests", ".tmp", `integration-flags-${runId}.json`);
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
  INTEGRATION_PROVIDER_URL: providerUrl,
  DATABASE_URL: databaseUrl,
  RUNTIME_FEATURE_FLAGS_PATH: runtimeFlagsPath,
  CLERK_SECRET_KEY: "sk_test_integration",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_integration",
  STRIPE_SECRET_KEY: "sk_test_integration",
  AWS_ACCESS_KEY_ID: "integration-access-key",
  AWS_SECRET_ACCESS_KEY: "integration-secret-key",
  AWS_REGION: "integration-region",
  AWS_ENDPOINT_URL_SES: `${providerUrl}/ses`,
  NEXT_PUBLIC_CLOUDFLARE_URL: appBaseUrl,
  NEXT_PUBLIC_SENTRY_ENABLED: "false",
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
const evidence = recording ? startEvidence(appRoot, specs) : null;
if (evidence) {
  integrationEnv.INTEGRATION_EVIDENCE_DIR = evidence.directory;
  console.log(`Evidence: ${evidence.directory}`);
} else {
  delete integrationEnv.INTEGRATION_EVIDENCE_DIR;
}

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

  exitCode = await run(
    path.join(appRoot, "node_modules", ".bin", "playwright"),
    ["test", "--config", "playwright.integration.config.ts", ...specs],
  );
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  removeIntegrationDatabaseFiles(databaseUrl);
  if (!process.env.RUNTIME_FEATURE_FLAGS_PATH)
    fs.rmSync(runtimeFlagsPath, { force: true });
  if (evidence?.finish(exitCode, forwardedSignal)) {
    console.error("Source changed during recording. Evidence is invalid.");
    exitCode = 1;
  }
}

if (forwardedSignal) process.kill(process.pid, forwardedSignal);
process.exitCode = exitCode;
