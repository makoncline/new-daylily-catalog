#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

const rootDir = process.cwd();

function run(cmd, cmdArgs, opts = {}) {
  const result = spawnSync(cmd, cmdArgs, { stdio: "inherit", ...opts });
  if (result.error) throw result.error;
  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function canExec(shellCmd, env = process.env) {
  return (
    spawnSync("bash", ["-lc", shellCmd], { stdio: "ignore", env }).status === 0
  );
}

function nextBuild(envOverrides = {}) {
  const nextBin = path.resolve(rootDir, "node_modules/.bin/next");
  if (!fs.existsSync(nextBin)) {
    console.error("Error: next binary not found (deps not installed?)");
    process.exit(1);
  }

  run(nextBin, ["build", "--turbopack", ...args], {
    env: { ...process.env, ...envOverrides },
  });
}

function resolveSqliteFilePath(localDatabaseUrl) {
  if (!localDatabaseUrl?.startsWith("file:")) return null;

  const raw = localDatabaseUrl.slice("file:".length);
  if (!raw) return null;

  if (path.isAbsolute(raw)) return raw;

  // Prisma tends to resolve relative SQLite paths from prisma/schema.prisma; use prisma/ as the base.
  return path.resolve(rootDir, "prisma", raw);
}

// Default behavior: normal build (remote Turso or whatever your app uses).
if (process.env.USE_TURSO_DB_FOR_BUILD !== "false") {
  nextBuild();
  process.exit(0);
}

console.log("[build] using local SQLite snapshot (USE_TURSO_DB_FOR_BUILD=false)");

const localDbPath = resolveSqliteFilePath(process.env.LOCAL_DATABASE_URL);
if (!localDbPath) {
  console.error(
    "Build: LOCAL_DATABASE_URL must be a sqlite file url like file:./build-snapshot.db",
  );
  process.exit(1);
}

if (!process.env.TURSO_API_TOKEN) {
  console.error(
    "Build: TURSO_API_TOKEN is required when USE_TURSO_DB_FOR_BUILD=false",
  );
  process.exit(1);
}

const dbName = process.env.TURSO_SNAPSHOT_DB_NAME || "daylily-catalog";

// Expect sqlite3 from vercel installCommand; fail fast if missing.
if (!canExec("command -v sqlite3 >/dev/null")) {
  console.error(
    "Build: sqlite3 missing (check vercel installCommand: dnf install -y sqlite ...)",
  );
  process.exit(1);
}

// Install Turso CLI if needed (expects curl/tar/xz from installCommand).
if (!canExec("command -v turso >/dev/null")) {
  run("bash", ["-lc", "curl -sSfL https://get.tur.so/install.sh | bash"]);

  const home = process.env.HOME;
  if (home) {
    process.env.PATH = `${path.join(home, ".turso")}:${process.env.PATH ?? ""}`;
  }

  if (!canExec("command -v turso >/dev/null")) {
    console.error("Build: turso CLI unavailable after install attempt.");
    process.exit(1);
  }
}

// Pull snapshot only if not already present.
if (!fs.existsSync(localDbPath)) {
  console.log(
    `Build: pulling Turso DB '${dbName}' snapshot to ${path.relative(rootDir, localDbPath)}...`,
  );

  // db-backup.sh treats CI=true as "upload to S3" and skips local restore. On Vercel, CI is often true.
  run("bash", ["scripts/db-backup.sh"], {
    env: {
      ...process.env,
      CI: "false",
      TURSO_SNAPSHOT_DB_NAME: dbName,
      TURSO_SNAPSHOT_OUTPUT_DB_PATH: localDbPath,
    },
  });
}

if (!fs.existsSync(localDbPath)) {
  console.error(
    `Build: expected snapshot DB at ${path.relative(rootDir, localDbPath)} but it does not exist.`,
  );
  process.exit(1);
}

// Build against local sqlite snapshot; runtime env remains unchanged.
nextBuild({
  USE_TURSO_DB: "false",
  LOCAL_DATABASE_URL: `file:${localDbPath}`,
});
