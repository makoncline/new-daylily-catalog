#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(appRoot, "../..");
const explicitDatabaseUrl = process.env.DATABASE_URL;

const args = [...process.argv.slice(2)];
let explicitEnvName = null;
let useSeededDatabaseDefault = false;

if (args[0] === "--env") {
  explicitEnvName = args[1] ?? null;
  args.splice(0, 2);
}

if (args[0] === "--seeded-database-default") {
  useSeededDatabaseDefault = true;
  args.shift();
}

if (args[0] === "--") args.shift();

const envName =
  explicitEnvName ??
  (process.env.NODE_ENV === "production" ? "production" : "development");
const envFile = `.env.${envName}`;

for (const envPath of [
  path.join(repoRoot, envFile),
  path.join(appRoot, envFile),
]) {
  if (existsSync(envPath)) dotenv.config({ path: envPath, quiet: true });
}

if (args.length === 0) process.exit(0);

const disposableIndex = useSeededDatabaseDefault
  ? args.indexOf("--disposable")
  : -1;
const disposableRequested = disposableIndex !== -1;
if (disposableRequested) {
  args.splice(disposableIndex, 1);
  if (explicitDatabaseUrl || envName !== "development") {
    throw new Error(
      "--disposable requires the default seeded development database. Unset DATABASE_URL.",
    );
  }
}

let disposableDatabase;
const ownsProcessGroup = disposableRequested && process.platform !== "win32";
let child;
let rejectChildExit;
let forwardedSignal;
let ownedShutdown;
const signalChild = (signal) => {
  if (!child?.pid) return;
  try {
    if (ownsProcessGroup) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
};

const signalHandlers = new Map();
if (disposableRequested) {
  for (const signal of ["SIGINT", "SIGTERM"]) {
    const handler = () => {
      forwardedSignal ??= signal;
      if (ownsProcessGroup && child?.pid) {
        ownedShutdown ??= stopOwnedProcessGroup();
        ownedShutdown.catch(rejectChildExit);
      } else signalChild(forwardedSignal);
    };
    signalHandlers.set(signal, handler);
    process.on(signal, handler);
  }
}

async function stopOwnedProcessGroup() {
  if (!ownsProcessGroup || !child?.pid) return;
  signalChild(forwardedSignal ?? "SIGTERM");
  const deadline = Date.now() + 5_000;
  while (true) {
    let permissionError;
    try {
      process.kill(-child.pid, 0);
    } catch (error) {
      if (error.code === "ESRCH") return;
      if (error.code !== "EPERM") throw error;
      permissionError = error;
    }
    if (Date.now() >= deadline) {
      if (permissionError)
        throw new Error(
          "Cannot confirm owned process group termination; disposable database retained.",
          { cause: permissionError },
        );
      signalChild("SIGKILL");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

let result = { code: 0, signal: null };
try {
  if (
    envName === "development" &&
    useSeededDatabaseDefault &&
    !explicitDatabaseUrl
  ) {
    const {
      assertRealisticDataSeedFresh,
      createDisposableRealisticDataSnapshot,
      resolveRealisticDataOutputPath,
    } = await import("./realistic-data-snapshot.mjs");
    const manifest = assertRealisticDataSeedFresh({
      manifestPath: path.join(appRoot, "local/realistic-data/personas.json"),
      schemaPath: path.join(appRoot, "prisma/schema.prisma"),
    });
    const seededDatabasePath = resolveRealisticDataOutputPath({
      appRoot,
      configuredPath: manifest.databasePath,
      cwd: appRoot,
    });
    if (!existsSync(seededDatabasePath)) {
      throw new Error(
        "The seeded development database is missing. Run `pnpm db:seed:prepare` first.",
      );
    }
    if (disposableRequested) {
      disposableDatabase = await createDisposableRealisticDataSnapshot({
        sourcePath: seededDatabasePath,
      });
      console.log(
        `Disposable realistic database: ${disposableDatabase.databasePath}`,
      );
      console.log("Local changes are removed when this server stops.");
      console.log(
        "After restart, use dashboard Refresh or a fresh browser context.",
      );
    } else {
      console.log(`Persistent realistic database: ${seededDatabasePath}`);
      console.log("Local changes remain after this server stops.");
    }
    process.env.DATABASE_URL = `file:${disposableDatabase?.databasePath ?? seededDatabasePath}`;
    process.env.TURSO_DATABASE_AUTH_TOKEN = "";
    process.env.TURSO_EMBEDDED_REPLICA_URL = "";
    process.env.TURSO_EMBEDDED_REPLICA_SYNC_INTERVAL_SECONDS = "";
    process.env.TURSO_EMBEDDED_REPLICA_SYNC_URL = "";
  }

  if (!forwardedSignal) {
    child = spawn(args[0], args.slice(1), {
      env: process.env,
      stdio: "inherit",
      detached: ownsProcessGroup,
    });
    result = await new Promise((resolve, reject) => {
      rejectChildExit = reject;
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });
  }
} finally {
  await (ownedShutdown ??= stopOwnedProcessGroup());
  disposableDatabase?.cleanup();
  for (const [signal, handler] of signalHandlers) process.off(signal, handler);
}

if (result.signal || forwardedSignal)
  process.kill(process.pid, forwardedSignal ?? result.signal);
else process.exitCode = result.code ?? 0;
