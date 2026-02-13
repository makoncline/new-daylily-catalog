#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

const rootDir = process.cwd();
const vercelEnv = process.env.VERCEL_ENV;
const isVercelProd = vercelEnv === "production";

const defaultTursoDbName = "daylily-catalog";

function defaultSnapshotPathForEnv(envName, dbName) {
  if (envName === "production") return `local-prod-copy-${dbName}.db`;
  if (envName === "preview") return `local-preview-copy-${dbName}.db`;
  return `local-copy-${dbName}.db`;
}

function execOrThrow(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    ...options,
  });

  if (result.error) throw result.error;
  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function execOk(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    ...options,
  });

  return result.status === 0;
}

function canExec(shellCmd, env) {
  const result = spawnSync("bash", ["-lc", shellCmd], {
    stdio: "ignore",
    env,
  });

  return result.status === 0;
}

function ensureTursoCli(env) {
  if (canExec("command -v turso >/dev/null 2>&1", env)) return env;

  if (!canExec("command -v curl >/dev/null 2>&1", env)) {
    console.warn(
      "Vercel prod build: turso CLI not found and curl is missing; falling back to remote DB for build.",
    );
    return env;
  }

  console.log("Vercel prod build: installing turso CLI...");
  const installed = execOk("bash", ["-lc", "curl -sSfL https://get.tur.so/install.sh | bash"], {
    env,
  });
  if (!installed) return env;

  const home = env.HOME ?? process.env.HOME;
  if (!home) return env;

  const tursoDir = path.join(home, ".turso");
  const nextPath = `${tursoDir}:${env.PATH ?? process.env.PATH ?? ""}`;
  return { ...env, PATH: nextPath };
}

function snapshotProdDb(env, snapshotPath, dbName) {
  if (!env.TURSO_API_TOKEN) {
    console.warn(
      "Vercel prod build: TURSO_API_TOKEN not set; falling back to remote DB for build.",
    );
    return false;
  }

  const tursoEnv = ensureTursoCli(env);
  if (!canExec("command -v turso >/dev/null 2>&1", tursoEnv)) {
    console.warn("Vercel prod build: turso CLI unavailable; falling back to remote DB for build.");
    return false;
  }

  if (!canExec("command -v sqlite3 >/dev/null 2>&1", tursoEnv)) {
    console.warn("Vercel prod build: sqlite3 missing; falling back to remote DB for build.");
    return false;
  }

  console.log(
    `Vercel ${vercelEnv ?? "unknown"} build: pulling Turso DB '${dbName}' snapshot to ${path.relative(
      rootDir,
      snapshotPath,
    )}...`,
  );

  // db-backup.sh treats CI=true as "upload to S3" and skips local restore. On Vercel, CI is often true,
  // so force it off for this command.
  const ok = execOk("bash", ["scripts/db-backup.sh"], {
    env: {
      ...tursoEnv,
      CI: "false",
      TURSO_SNAPSHOT_DB_NAME: dbName,
      TURSO_SNAPSHOT_OUTPUT_DB_PATH: snapshotPath,
    },
  });

  if (!ok) {
    console.warn("Vercel build: local DB snapshot failed; falling back to remote DB for build.");
    return false;
  }

  return true;
}

function runNextBuild(envOverrides = {}) {
  const nextBin = path.resolve(rootDir, "node_modules/.bin/next");
  const env = { ...process.env, ...envOverrides };

  if (!fs.existsSync(nextBin)) {
    // pnpm should have installed deps already, but keep a clear error if build runs without install.
    console.error("Error: next binary not found. Did you run pnpm install?");
    process.exit(1);
  }

  execOrThrow(nextBin, ["build", "--turbopack", ...args], { env });
}

const useLocalSnapshotForBuild =
  process.env.USE_LOCAL_DB_SNAPSHOT_FOR_BUILD === "true" ||
  (process.env.USE_LOCAL_DB_SNAPSHOT_FOR_BUILD !== "false" && isVercelProd);

if (!useLocalSnapshotForBuild) {
  runNextBuild();
  process.exit(0);
}

const snapshotDbName = process.env.BUILD_SNAPSHOT_TURSO_DB_NAME ?? defaultTursoDbName;
const snapshotPath = path.resolve(
  rootDir,
  process.env.BUILD_SNAPSHOT_OUTPUT_DB_PATH ??
    defaultSnapshotPathForEnv(vercelEnv, snapshotDbName),
);

const hasSnapshot = fs.existsSync(snapshotPath);
const didPull = hasSnapshot ? true : snapshotProdDb(process.env, snapshotPath, snapshotDbName);

if (!didPull) {
  runNextBuild();
  process.exit(0);
}

runNextBuild({
  LOCAL_DATABASE_URL: `file:${snapshotPath}`,
  USE_TURSO_DB: "false",
});
