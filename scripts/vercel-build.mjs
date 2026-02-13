#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

const rootDir = process.cwd();

const defaultTursoDbName = "daylily-catalog";

function resolveLocalDbPathFromUrl(localDatabaseUrl) {
  if (!localDatabaseUrl) return null;
  if (!localDatabaseUrl.startsWith("file:")) return null;

  // Supports file:./relative.db and file:/absolute.db
  const raw = localDatabaseUrl.slice("file:".length);
  if (!raw) return null;

  if (path.isAbsolute(raw)) return raw;

  // Prisma tends to resolve relative SQLite paths from prisma/schema.prisma; use prisma/ as the base.
  return path.resolve(rootDir, "prisma", raw);
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
    console.error("Build: turso CLI not found and curl is missing.");
    process.exit(1);
  }

  console.log("Build: installing turso CLI...");
  execOrThrow("bash", ["-lc", "curl -sSfL https://get.tur.so/install.sh | bash"], { env });

  const home = env.HOME ?? process.env.HOME;
  if (!home) return env;

  const tursoDir = path.join(home, ".turso");
  const nextPath = `${tursoDir}:${env.PATH ?? process.env.PATH ?? ""}`;
  return { ...env, PATH: nextPath };
}

function ensureSqlite3Cli(env) {
  if (canExec("command -v sqlite3 >/dev/null 2>&1", env)) return env;

  if (!canExec("command -v curl >/dev/null 2>&1", env)) {
    console.error("Build: sqlite3 is missing and curl is not available to install it.");
    process.exit(1);
  }

  const home = env.HOME ?? process.env.HOME;
  if (!home) {
    console.error("Build: HOME is not set; cannot install sqlite3 tools.");
    process.exit(1);
  }

  // Resolve the current Linux x64 sqlite-tools URL from the official download page.
  // This avoids hardcoding versions/years.
  const getRelativeUrlCmd =
    "curl -sSfL https://www.sqlite.org/download.html | tr -d '\\r' | " +
    "awk -F, '/^PRODUCT,[0-9]+,[^,]*sqlite-tools-linux-x64-[0-9]+\\\\.zip,/{print $3; exit}'";

  const relativeUrlResult = spawnSync("bash", ["-lc", getRelativeUrlCmd], {
    encoding: "utf8",
    env,
  });

  const relativeUrl = (relativeUrlResult.stdout ?? "").trim();
  if (!relativeUrl) {
    console.error("Build: failed to resolve sqlite-tools download URL from sqlite.org.");
    process.exit(1);
  }

  const canUseUnzip = canExec("command -v unzip >/dev/null 2>&1", env);
  const canUsePython3 = canExec("command -v python3 >/dev/null 2>&1", env);
  const canUsePython = canExec("command -v python >/dev/null 2>&1", env);
  if (!canUseUnzip && !canUsePython3 && !canUsePython) {
    console.error(
      "Build: neither unzip nor python is available (required to extract sqlite-tools).",
    );
    process.exit(1);
  }

  const cacheDir = path.join(home, ".cache", "sqlite-tools");
  const zipPath = path.join(cacheDir, "sqlite-tools-linux-x64.zip");
  const extractDir = path.join(cacheDir, "extract");
  const fullUrl = `https://www.sqlite.org/${relativeUrl.replace(/^\/+/, "")}`;

  console.log(`Build: installing sqlite3 CLI from ${fullUrl}...`);

  execOrThrow("bash", ["-lc", `mkdir -p "${cacheDir}" "${extractDir}"`], { env });
  execOrThrow("bash", ["-lc", `rm -f "${zipPath}"`], { env });
  execOrThrow("bash", ["-lc", `curl -sSfL "${fullUrl}" -o "${zipPath}"`], { env });

  if (canUseUnzip) {
    execOrThrow("bash", ["-lc", `unzip -qo "${zipPath}" -d "${extractDir}"`], { env });
  } else {
    const pythonCmd = canUsePython3 ? "python3" : "python";
    const extractCmd =
      `${pythonCmd} - <<'PY'\n` +
      `import zipfile\n` +
      `with zipfile.ZipFile(${JSON.stringify(zipPath)}) as z:\n` +
      `  z.extractall(${JSON.stringify(extractDir)})\n` +
      `PY`;
    execOrThrow("bash", ["-lc", extractCmd], { env });
  }

  const findSqlite3Cmd = `find "${extractDir}" -maxdepth 3 -type f -name sqlite3 | head -n 1`;
  const sqlite3PathResult = spawnSync("bash", ["-lc", findSqlite3Cmd], {
    encoding: "utf8",
    env,
  });
  const sqlite3Path = (sqlite3PathResult.stdout ?? "").trim();
  if (!sqlite3Path) {
    console.error("Build: sqlite3 binary not found after extracting sqlite-tools.");
    process.exit(1);
  }

  execOrThrow("bash", ["-lc", `chmod +x "${sqlite3Path}"`], { env });

  const sqliteBinDir = path.dirname(sqlite3Path);
  const nextEnv = { ...env, PATH: `${sqliteBinDir}:${env.PATH ?? process.env.PATH ?? ""}` };

  if (!canExec("command -v sqlite3 >/dev/null 2>&1", nextEnv)) {
    console.error("Build: sqlite3 still not available after install attempt.");
    process.exit(1);
  }

  return nextEnv;
}

function snapshotProdDb(env, snapshotPath, dbName) {
  if (!env.TURSO_API_TOKEN) {
    console.error("Build: TURSO_API_TOKEN is not set (required for local DB snapshot).");
    process.exit(1);
  }

  const tursoEnv = ensureSqlite3Cli(ensureTursoCli(env));
  if (!canExec("command -v turso >/dev/null 2>&1", tursoEnv)) {
    console.error("Build: turso CLI unavailable after install attempt.");
    process.exit(1);
  }

  console.log(
    `Build: pulling Turso DB '${dbName}' snapshot to ${path.relative(rootDir, snapshotPath)}...`,
  );

  // db-backup.sh treats CI=true as "upload to S3" and skips local restore. On Vercel, CI is often true,
  // so force it off for this command.
  execOrThrow("bash", ["scripts/db-backup.sh"], {
    env: {
      ...tursoEnv,
      CI: "false",
      TURSO_SNAPSHOT_DB_NAME: dbName,
      TURSO_SNAPSHOT_OUTPUT_DB_PATH: snapshotPath,
    },
  });

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

// Only use snapshots when explicitly opted in.
// - USE_TURSO_DB_FOR_BUILD=true (or unset): build against remote Turso.
// - USE_TURSO_DB_FOR_BUILD=false: build against local SQLite snapshot.
const useSnapshotBuild = process.env.USE_TURSO_DB_FOR_BUILD === "false";
if (!useSnapshotBuild) {
  runNextBuild();
  process.exit(0);
}

console.log("[build] using local SQLite snapshot (USE_TURSO_DB_FOR_BUILD=false)");

const localDbPath = resolveLocalDbPathFromUrl(process.env.LOCAL_DATABASE_URL);
if (!localDbPath) {
  console.error(
    "Build: LOCAL_DATABASE_URL must be set to a SQLite file url (e.g. file:./local-build.db) to use snapshot builds.",
  );
  process.exit(1);
}

const snapshotDbName = process.env.TURSO_SNAPSHOT_DB_NAME ?? defaultTursoDbName;
const snapshotPath = localDbPath;

const hasSnapshot = fs.existsSync(snapshotPath);
if (!hasSnapshot) {
  snapshotProdDb(process.env, snapshotPath, snapshotDbName);
  if (!fs.existsSync(snapshotPath)) {
    console.error(
      `Build: expected snapshot DB at ${path.relative(rootDir, snapshotPath)} but it does not exist.`,
    );
    process.exit(1);
  }
}

runNextBuild({
  LOCAL_DATABASE_URL: `file:${snapshotPath}`,
  USE_TURSO_DB: "false",
});
