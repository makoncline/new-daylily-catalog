import { execFileSync, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  FORBIDDEN_SERVICE_ENV,
  removeIntegrationDatabaseFiles,
  validateIntegrationRuntime,
} from "./integration-network-guard.mjs";

export const appRoot = path.resolve(import.meta.dirname, "..");

export function createIntegrationRuntime({
  appPort = 3210,
  providerPort = Number(appPort) + 1,
} = {}) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Local providers cannot run in production.");
  const port = Number(appPort);
  if (!Number.isInteger(port) || port < 1 || port >= 65535) {
    throw new Error("INTEGRATION_PORT must be a port from 1 to 65534.");
  }
  const appBaseUrl = `http://localhost:${port}`;
  const providerUrl = `http://127.0.0.1:${providerPort}`;
  const runId = `${process.pid}-${crypto.randomUUID()}`;
  const databasePath = path.join(
    appRoot,
    "tests",
    ".tmp",
    `integration-${runId}.sqlite`,
  );
  const databaseUrl = `file:${databasePath}`;
  const runtimeFlagsPath = path.join(
    appRoot,
    "tests",
    ".tmp",
    `integration-flags-${runId}.json`,
  );
  const guardUrl = pathToFileURL(
    path.join(appRoot, "scripts", "integration-network-guard.mjs"),
  ).href;

  /** @type {NodeJS.ProcessEnv} */
  const integrationEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    CI: process.env.CI,
    TERM: process.env.TERM,
    NODE_ENV: "development",
    INTEGRATION_MODE: "1",
    INTEGRATION_NETWORK_GUARD: "1",
    APP_BASE_URL: appBaseUrl,
    INTEGRATION_PROVIDER_URL: providerUrl,
    DATABASE_URL: databaseUrl,
    RUNTIME_FEATURE_FLAGS_PATH: runtimeFlagsPath,
    DAYLILY_TRUST_PROXY_IP: "false",
    DAYLILY_MCP_OAUTH_CLIENT_ID: "integration-oauth-client",
    DAYLILY_MEMBER_API_OAUTH_CLIENT_IDS: "integration-oauth-client",
    SENTRY_RELEASE: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: appRoot,
      encoding: "utf8",
    }).trim(),
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

  const children = new Set();
  let stopping = false;
  function run(command, args, guarded = false) {
    return new Promise((resolve, reject) => {
      if (stopping) return reject(new Error("Local runtime is stopping."));
      const child = spawn(command, args, {
        cwd: appRoot,
        env: {
          ...integrationEnv,
          INTEGRATION_NETWORK_GUARD: guarded ? "1" : "0",
          NODE_OPTIONS: guarded ? integrationEnv.NODE_OPTIONS : "",
        },
        stdio: "inherit",
        detached: process.platform !== "win32",
      });
      children.add(child);
      child.once("error", (error) => {
        children.delete(child);
        reject(error);
      });
      child.once("exit", (code, signal) => {
        children.delete(child);
        if (signal && !stopping)
          reject(new Error(`${command} exited from ${signal}.`));
        else resolve(code ?? 1);
      });
    });
  }

  async function prepare() {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    removeIntegrationDatabaseFiles(databaseUrl);
    if (
      (await run(path.join(appRoot, "node_modules/.bin/prisma"), [
        "db",
        "push",
      ])) !== 0
    )
      throw new Error("Failed to prepare integration database.");
    if (
      (await run(process.execPath, [
        path.join(appRoot, "scripts/seed-integration-data.mjs"),
        databaseUrl,
      ])) !== 0
    )
      throw new Error("Failed to seed integration database.");
  }
  function signalChildren(signal) {
    stopping = true;
    for (const child of children) {
      try {
        if (process.platform !== "win32") process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
    }
  }
  async function cleanup() {
    const closed = [...children].map(
      (child) => new Promise((resolve) => child.once("close", resolve)),
    );
    signalChildren("SIGTERM");
    const timer = setTimeout(() => signalChildren("SIGKILL"), 5000);
    try {
      await Promise.all(closed);
    } finally {
      clearTimeout(timer);
    }
    removeIntegrationDatabaseFiles(databaseUrl);
    fs.rmSync(runtimeFlagsPath, { force: true });
  }
  return {
    env: integrationEnv,
    appBaseUrl,
    providerUrl,
    databaseUrl,
    prepare,
    run,
    signalChildren,
    cleanup,
  };
}
