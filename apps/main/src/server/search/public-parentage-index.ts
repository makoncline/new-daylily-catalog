import "server-only";

import { execFile } from "node:child_process";
import { mkdir, open, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { createClient } from "@libsql/client";
import {
  ensurePublicSearchIndex,
  getPublicSearchIndexPath,
} from "@/server/search/public-search-index";

const execFileAsync = promisify(execFile);

const PARENTAGE_INDEX_FRESH_FOR_SECONDS = 30 * 24 * 60 * 60;
const PARENTAGE_INDEX_MAX_STALE_SECONDS = 180 * 24 * 60 * 60;
const PARENTAGE_INDEX_REFRESH_LOCK_STALE_MS = 30 * 60 * 1000;
const EXPECTED_PARENTAGE_INDEX_SCHEMA_VERSION = "2";

interface ParentageIndexMeta {
  builtAt: string | null;
  sourcePath: string | null;
  schemaVersion: string | null;
}

export interface PublicParentageIndexStatus {
  exists: boolean;
  path: string;
  status: "missing" | "fresh" | "stale" | "expired";
  builtAt: string | null;
  ageSeconds: number | null;
  refreshing: boolean;
  counts: {
    parentageNodes: number;
  } | null;
  sourcePath: string | null;
  schemaVersion: string | null;
}

const globalForParentageIndex = globalThis as unknown as {
  publicParentageIndexRefreshPromise:
    | Promise<PublicParentageIndexStatus>
    | undefined;
};

function getAppRoot() {
  const cwd = process.cwd();

  if (process.env.NODE_ENV !== "production" || cwd.endsWith("apps/main")) {
    return cwd;
  }

  return path.join(cwd, "apps/main");
}

export function getPublicParentageIndexPath() {
  if (process.env.NODE_ENV === "production") {
    return "/data/search/public-parentage.sqlite";
  }

  return path.join(getAppRoot(), ".tmp/search/cultivar-parentage.sqlite");
}

function getBuildScriptPath() {
  return path.join(getAppRoot(), "scripts/build-public-parentage-index.mjs");
}

function getRefreshLockPath() {
  return `${getPublicParentageIndexPath()}.refresh.lock`;
}

function isMissingFileError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function isFileExistsError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "EEXIST"
  );
}

function toStringOrNull(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getAgeSeconds(builtAt: string | null) {
  if (!builtAt) {
    return null;
  }

  const builtAtMs = new Date(builtAt).getTime();
  if (Number.isNaN(builtAtMs)) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - builtAtMs) / 1000));
}

function getStatusFromAge(
  ageSeconds: number | null,
  schemaVersion: string | null,
) {
  if (schemaVersion !== EXPECTED_PARENTAGE_INDEX_SCHEMA_VERSION) {
    return "expired" satisfies PublicParentageIndexStatus["status"];
  }

  if (ageSeconds === null) {
    return "expired" satisfies PublicParentageIndexStatus["status"];
  }

  if (ageSeconds < PARENTAGE_INDEX_FRESH_FOR_SECONDS) {
    return "fresh" satisfies PublicParentageIndexStatus["status"];
  }

  if (ageSeconds < PARENTAGE_INDEX_MAX_STALE_SECONDS) {
    return "stale" satisfies PublicParentageIndexStatus["status"];
  }

  return "expired" satisfies PublicParentageIndexStatus["status"];
}

async function queryParentageIndexMeta(dbPath: string) {
  const client = createClient({ url: `file:${dbPath}` });

  try {
    const [metaResult, nodeCountResult] = await Promise.all([
      client.execute("SELECT key, value FROM ParentageIndexMeta"),
      client.execute("SELECT COUNT(*) AS count FROM CultivarParentageNode"),
    ]);

    const meta = metaResult.rows.reduce<ParentageIndexMeta>(
      (acc, row) => {
        const key = toStringOrNull(row.key) ?? "";
        const value = toStringOrNull(row.value) ?? "";

        if (key === "builtAt") {
          acc.builtAt = value;
        } else if (key === "sourcePath") {
          acc.sourcePath = value;
        } else if (key === "schemaVersion") {
          acc.schemaVersion = value;
        }

        return acc;
      },
      {
        builtAt: null,
        schemaVersion: null,
        sourcePath: null,
      },
    );

    return {
      counts: {
        parentageNodes: Number(nodeCountResult.rows[0]?.count ?? 0),
      },
      meta,
    };
  } finally {
    client.close();
  }
}

async function hasActiveRefreshLock() {
  try {
    const lockStat = await stat(getRefreshLockPath());
    return Date.now() - lockStat.mtimeMs < PARENTAGE_INDEX_REFRESH_LOCK_STALE_MS;
  } catch (error) {
    if (isMissingFileError(error)) {
      return false;
    }

    throw error;
  }
}

export async function getPublicParentageIndexStatus(): Promise<PublicParentageIndexStatus> {
  const dbPath = getPublicParentageIndexPath();

  try {
    await stat(dbPath);
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }

    return {
      ageSeconds: null,
      builtAt: null,
      counts: null,
      exists: false,
      path: dbPath,
      refreshing:
        Boolean(globalForParentageIndex.publicParentageIndexRefreshPromise) ||
        (await hasActiveRefreshLock()),
      schemaVersion: null,
      sourcePath: null,
      status: "missing",
    };
  }

  const { counts, meta } = await queryParentageIndexMeta(dbPath);
  const ageSeconds = getAgeSeconds(meta.builtAt);

  return {
    ageSeconds,
    builtAt: meta.builtAt,
    counts,
    exists: true,
    path: dbPath,
    refreshing:
      Boolean(globalForParentageIndex.publicParentageIndexRefreshPromise) ||
      (await hasActiveRefreshLock()),
    schemaVersion: meta.schemaVersion,
    sourcePath: meta.sourcePath,
    status: getStatusFromAge(ageSeconds, meta.schemaVersion),
  };
}

async function acquireRefreshLock() {
  const lockPath = getRefreshLockPath();
  await mkdir(path.dirname(lockPath), { recursive: true });

  try {
    const handle = await open(lockPath, "wx");
    await handle.writeFile(
      JSON.stringify({
        createdAt: new Date().toISOString(),
        pid: process.pid,
      }),
      "utf8",
    );

    return async () => {
      await handle.close();
      await unlink(lockPath).catch((error) => {
        if (!isMissingFileError(error)) {
          throw error;
        }
      });
    };
  } catch (error) {
    if (!isFileExistsError(error)) {
      throw error;
    }

    const lockStat = await stat(lockPath);
    if (Date.now() - lockStat.mtimeMs < PARENTAGE_INDEX_REFRESH_LOCK_STALE_MS) {
      return null;
    }

    await unlink(lockPath);
    return acquireRefreshLock();
  }
}

function logParentageIndex(event: string, payload: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({
      component: "public-parentage-index",
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    }),
  );
}

export async function refreshPublicParentageIndex(): Promise<PublicParentageIndexStatus> {
  globalForParentageIndex.publicParentageIndexRefreshPromise ??= (async () => {
      await ensurePublicSearchIndex();
      const releaseLock = await acquireRefreshLock();

      if (!releaseLock) {
        logParentageIndex("public_parentage_index_refresh_skipped_locked");
        return getPublicParentageIndexStatus();
      }

      try {
        logParentageIndex("public_parentage_index_build_started", {
          path: getPublicParentageIndexPath(),
          sourcePath: getPublicSearchIndexPath(),
        });

        const { stdout, stderr } = await execFileAsync(
          process.execPath,
          [
            getBuildScriptPath(),
            "--source",
            getPublicSearchIndexPath(),
            "--target",
            getPublicParentageIndexPath(),
          ],
          {
            cwd: getAppRoot(),
            env: process.env,
            maxBuffer: 1024 * 1024,
          },
        );

        if (stdout.trim().length > 0) {
          logParentageIndex("public_parentage_index_build_stdout", {
            output: stdout.trim(),
          });
        }

        if (stderr.trim().length > 0) {
          logParentageIndex("public_parentage_index_build_stderr", {
            output: stderr.trim(),
          });
        }

        const status = await getPublicParentageIndexStatus();
        logParentageIndex("public_parentage_index_build_succeeded", {
          ageSeconds: status.ageSeconds,
          counts: status.counts,
          path: status.path,
        });

        return status;
      } catch (error) {
        logParentageIndex("public_parentage_index_build_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        await releaseLock();
      }
  })().finally(() => {
    globalForParentageIndex.publicParentageIndexRefreshPromise = undefined;
  });

  return globalForParentageIndex.publicParentageIndexRefreshPromise;
}

export async function ensurePublicParentageIndex() {
  const status = await getPublicParentageIndexStatus();

  if (status.status === "missing" || status.status === "expired") {
    void refreshPublicParentageIndex().catch(() => undefined);
    return status;
  }

  if (status.status === "stale") {
    void refreshPublicParentageIndex().catch(() => undefined);
  }

  return status;
}
