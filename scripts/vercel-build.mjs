#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

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
  execOrThrow(
    "bash",
    ["-lc", "curl -sSfL https://get.tur.so/install.sh | bash"],
    { env },
  );

  const home = env.HOME ?? process.env.HOME;
  if (!home) return env;

  const tursoDir = path.join(home, ".turso");
  const nextPath = `${tursoDir}:${env.PATH ?? process.env.PATH ?? ""}`;
  return { ...env, PATH: nextPath };
}

function ensureSqlite3Cli(env) {
  if (canExec("command -v sqlite3 >/dev/null 2>&1", env)) return env;

  if (!canExec("command -v curl >/dev/null 2>&1", env)) {
    console.error(
      "Build: sqlite3 is missing and curl is not available to install it.",
    );
    process.exit(1);
  }

  const home = env.HOME ?? process.env.HOME;
  if (!home) {
    console.error("Build: HOME is not set; cannot install sqlite3 tools.");
    process.exit(1);
  }

  const toolArch = "x64";

  // Resolve the current sqlite-tools URL from the official download page.
  // The page typically links something like:
  //   <a href="2025/sqlite-tools-linux-x64-3480000.zip">...</a>
  const downloadPageResult = spawnSync(
    "bash",
    ["-lc", "curl -sSfL https://www.sqlite.org/download.html"],
    { encoding: "utf8", env },
  );

  if (downloadPageResult.status !== 0) {
    const stderr = (downloadPageResult.stderr ?? "").trim();
    console.error(
      `Build: failed to fetch sqlite download page (exit ${downloadPageResult.status}).`,
    );
    if (stderr) console.error(stderr);
    process.exit(1);
  }

  const downloadPageHtml = downloadPageResult.stdout ?? "";
  const hrefRe = new RegExp(
    `href=[\"']([^\"']*sqlite-tools-linux-${toolArch}-[0-9]+\\\\.zip)[\"']`,
    "i",
  );

  const match = downloadPageHtml.match(hrefRe);
  const relativeUrl = match?.[1]?.trim();
  if (!relativeUrl) {
    console.error(
      "Build: failed to resolve sqlite-tools download URL from sqlite.org.",
    );
    process.exit(1);
  }

  const cacheDir = path.join(home, ".cache", "sqlite-tools");
  const zipPath = path.join(cacheDir, `sqlite-tools-linux-${toolArch}.zip`);
  const binDir = path.join(cacheDir, "bin");
  const cachedSqlite3Path = path.join(binDir, "sqlite3");
  const fullUrl = relativeUrl.startsWith("http")
    ? relativeUrl
    : `https://www.sqlite.org/${relativeUrl.replace(/^\/+/, "")}`;

  if (fs.existsSync(cachedSqlite3Path)) {
    const nextEnv = {
      ...env,
      PATH: `${binDir}:${env.PATH ?? process.env.PATH ?? ""}`,
    };
    if (canExec("command -v sqlite3 >/dev/null 2>&1", nextEnv)) return nextEnv;
  }

  console.log(`Build: installing sqlite3 CLI from ${fullUrl}...`);

  execOrThrow("bash", ["-lc", `mkdir -p "${cacheDir}" "${binDir}"`], {
    env,
  });
  execOrThrow("bash", ["-lc", `rm -f "${zipPath}"`], { env });
  execOrThrow("bash", ["-lc", `curl -sSfL "${fullUrl}" -o "${zipPath}"`], {
    env,
  });

  const zipData = fs.readFileSync(zipPath);

  const eocdSig = 0x06054b50;
  const cdSig = 0x02014b50;
  const lfSig = 0x04034b50;

  function findEocdOffset(buf) {
    // EOCD is at most 65,557 bytes from the end (64KB comment + 22B header).
    const min = Math.max(0, buf.length - 65557);
    for (let i = buf.length - 22; i >= min; i--) {
      if (buf.readUInt32LE(i) === eocdSig) return i;
    }
    return -1;
  }

  const eocdOffset = findEocdOffset(zipData);
  if (eocdOffset < 0) {
    console.error("Build: invalid sqlite-tools zip (EOCD not found).");
    process.exit(1);
  }

  const centralDirSize = zipData.readUInt32LE(eocdOffset + 12);
  const centralDirOffset = zipData.readUInt32LE(eocdOffset + 16);

  let cursor = centralDirOffset;
  const centralDirEnd = centralDirOffset + centralDirSize;

  let sqliteEntry = null;
  while (cursor < centralDirEnd) {
    if (zipData.readUInt32LE(cursor) !== cdSig) break;

    const compressionMethod = zipData.readUInt16LE(cursor + 10);
    const compressedSize = zipData.readUInt32LE(cursor + 20);
    const uncompressedSize = zipData.readUInt32LE(cursor + 24);
    const fileNameLength = zipData.readUInt16LE(cursor + 28);
    const extraLength = zipData.readUInt16LE(cursor + 30);
    const commentLength = zipData.readUInt16LE(cursor + 32);
    const localHeaderOffset = zipData.readUInt32LE(cursor + 42);

    const nameStart = cursor + 46;
    const nameEnd = nameStart + fileNameLength;
    const name = zipData.toString("utf8", nameStart, nameEnd);

    if (name.endsWith("/sqlite3") || name === "sqlite3") {
      sqliteEntry = {
        name,
        compressionMethod,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
      };
      break;
    }

    cursor = nameEnd + extraLength + commentLength;
  }

  if (!sqliteEntry) {
    console.error("Build: sqlite3 binary not found inside sqlite-tools zip.");
    process.exit(1);
  }

  const lh = sqliteEntry.localHeaderOffset;
  if (zipData.readUInt32LE(lh) !== lfSig) {
    console.error("Build: invalid sqlite-tools zip (local header not found).");
    process.exit(1);
  }

  const fileNameLength = zipData.readUInt16LE(lh + 26);
  const extraLength = zipData.readUInt16LE(lh + 28);
  const dataOffset = lh + 30 + fileNameLength + extraLength;

  const compressed = zipData.subarray(dataOffset, dataOffset + sqliteEntry.compressedSize);
  let uncompressed;
  if (sqliteEntry.compressionMethod === 0) {
    uncompressed = compressed;
  } else if (sqliteEntry.compressionMethod === 8) {
    uncompressed = inflateRawSync(compressed);
  } else {
    console.error(`Build: unsupported zip compression method: ${sqliteEntry.compressionMethod}`);
    process.exit(1);
  }

  if (sqliteEntry.uncompressedSize && uncompressed.length !== sqliteEntry.uncompressedSize) {
    console.error("Build: sqlite3 binary size mismatch after extraction.");
    process.exit(1);
  }

  fs.writeFileSync(cachedSqlite3Path, uncompressed, { mode: 0o755 });

  const nextEnv = {
    ...env,
    PATH: `${binDir}:${env.PATH ?? process.env.PATH ?? ""}`,
  };

  if (!canExec("command -v sqlite3 >/dev/null 2>&1", nextEnv)) {
    console.error("Build: sqlite3 still not available after install attempt.");
    process.exit(1);
  }

  return nextEnv;
}

function snapshotProdDb(env, snapshotPath, dbName) {
  if (!env.TURSO_API_TOKEN) {
    console.error(
      "Build: TURSO_API_TOKEN is not set (required for local DB snapshot).",
    );
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

console.log(
  "[build] using local SQLite snapshot (USE_TURSO_DB_FOR_BUILD=false)",
);

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
