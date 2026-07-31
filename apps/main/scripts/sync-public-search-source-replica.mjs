import { writeSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";

const CORRUPTION_PATTERN =
  /InvalidLocalState|database disk image is malformed|file is not a database|malformed database schema/i;

/** @typedef {"source_sync" | "post_sync_client" | null} SourceSyncPhase */
/** @typedef {{ ok: false, error: string, phase: SourceSyncPhase }} SyncFailure */
/** @typedef {{ ok: true, durationMs: number, frameNumber: number | null, framesSynced: number | null, pid: number }} SyncSuccess */
/** @typedef {SyncFailure | SyncSuccess} SyncResult */
/** @typedef {{ close: () => void, execute: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }>, sync: () => Promise<{ frame_no: number, frames_synced: number } | undefined> }} SyncClient */
/** @typedef {(config: { authToken: string, syncUrl: string, url: string }) => SyncClient} ClientFactory */

/**
 * @param {unknown} error
 * @param {SourceSyncPhase} phase
 * @returns {SyncFailure}
 */
function failure(error, phase = null) {
  return {
    ok: false,
    error:
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    phase,
  };
}

/** @param {string[]} args */
function getSourcePath(args) {
  if (args.length !== 2 || args[0] !== "--source" || !args[1]) {
    throw new Error(
      "Usage: sync-public-search-source-replica.mjs --source PATH",
    );
  }

  return args[1];
}

/**
 * @param {SyncClient} client
 * @param {number} startedAt
 * @returns {Promise<SyncResult>}
 */
async function syncAndCheck(client, startedAt) {
  let syncResult;
  try {
    syncResult = await client.sync();
  } catch (error) {
    return failure(
      error,
      CORRUPTION_PATTERN.test(String(error)) ? "source_sync" : null,
    );
  }

  let check;
  try {
    check = await client.execute("PRAGMA quick_check;");
  } catch (error) {
    return failure(
      error,
      CORRUPTION_PATTERN.test(String(error)) ? "post_sync_client" : null,
    );
  }

  const quickCheck = check.rows
    .map((row) => (typeof row.quick_check === "string" ? row.quick_check : ""))
    .filter(Boolean)
    .join("\n");

  if (quickCheck !== "ok") {
    return failure(
      new Error(`Source replica quick_check failed: ${quickCheck}`),
      "post_sync_client",
    );
  }

  return {
    ok: true,
    durationMs: Math.round(performance.now() - startedAt),
    frameNumber: syncResult?.frame_no ?? null,
    framesSynced: syncResult?.frames_synced ?? null,
    pid: process.pid,
  };
}

/**
 * @param {{ authToken: string | undefined, clientFactory?: ClientFactory, sourcePath: string, syncUrl: string | undefined }} options
 * @returns {Promise<SyncResult>}
 */
export async function syncSourceReplica({
  authToken,
  clientFactory = /** @type {ClientFactory} */ (createClient),
  sourcePath,
  syncUrl,
}) {
  if (!syncUrl?.startsWith("libsql://")) {
    return failure(new Error("DATABASE_URL must be a libsql:// URL."));
  }
  if (!authToken) {
    return failure(new Error("TURSO_DATABASE_AUTH_TOKEN is required."));
  }

  let client;
  try {
    client = clientFactory({
      authToken,
      syncUrl,
      url: `file:${sourcePath}`,
    });
  } catch (error) {
    return failure(error);
  }

  let result;
  try {
    result = await syncAndCheck(client, performance.now());
  } catch (error) {
    result = failure(error);
  }

  try {
    client.close();
  } catch (error) {
    return result.ok ? failure(error) : result;
  }

  return result;
}

async function main() {
  let result;
  try {
    result = await syncSourceReplica({
      authToken: process.env.TURSO_DATABASE_AUTH_TOKEN,
      sourcePath: getSourcePath(process.argv.slice(2)),
      syncUrl: process.env.DATABASE_URL,
    });
  } catch (error) {
    result = failure(error);
  }
  writeSync(process.stdout.fd, `${JSON.stringify(result)}\n`);

  if (!result.ok) {
    writeSync(process.stderr.fd, `${result.error}\n`);
  }

  process.exit(result.ok ? 0 : 1);
}

const entryPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (entryPath === import.meta.url) {
  void main();
}
