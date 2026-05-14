import "server-only";

import { execFile } from "node:child_process";
import { mkdir, open, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { createClient } from "@libsql/client";
import { env, isLibsqlDatabaseUrl } from "@/env";

const execFileAsync = promisify(execFile);

const DEFAULT_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS = 60 * 60;
const SEARCH_INDEX_MAX_STALE_SECONDS = 24 * 60 * 60;
const SEARCH_INDEX_REFRESH_LOCK_STALE_MS = 10 * 60 * 1000;
const EXPECTED_SEARCH_INDEX_SCHEMA_VERSION = "5";
const PUBLIC_SEARCH_BUILD_SOURCE_REPLICA_PATH =
  "/data/search/public-search-source-replica.sqlite";

interface SearchIndexMeta {
  builtAt: string | null;
  sourcePath: string | null;
  schemaVersion: string | null;
}

export interface PublicSearchIndexStatus {
  exists: boolean;
  path: string;
  status: "missing" | "fresh" | "stale" | "expired";
  builtAt: string | null;
  ageSeconds: number | null;
  refreshing: boolean;
  counts: {
    cultivars: number;
    linkedListings: number;
  } | null;
  sourcePath: string | null;
  schemaVersion: string | null;
}

export class PublicSearchIndexUnavailableError extends Error {
  constructor(status: PublicSearchIndexStatus) {
    super("Public search index is not available.");
    this.name = "PublicSearchIndexUnavailableError";
    this.status = status;
  }

  status: PublicSearchIndexStatus;
}

const globalForPublicSearchIndex = globalThis as unknown as {
  publicSearchIndexRefreshPromise: Promise<PublicSearchIndexStatus> | undefined;
};

function getAppRoot() {
  const cwd = process.cwd();

  if (process.env.NODE_ENV !== "production" || cwd.endsWith("apps/main")) {
    return cwd;
  }

  return path.join(cwd, "apps/main");
}

export function getPublicSearchIndexPath() {
  if (process.env.NODE_ENV === "production") {
    return "/data/search/public-search.sqlite";
  }

  return path.join(getAppRoot(), ".tmp/search/cultivar-search.sqlite");
}

function getBuildScriptPath() {
  return path.join(getAppRoot(), "scripts/build-public-search-index.mjs");
}

function getRefreshLockPath() {
  return `${getPublicSearchIndexPath()}.refresh.lock`;
}

async function preparePublicSearchBuildSource() {
  const databaseUrl = env.DATABASE_URL;

  if (
    process.env.NODE_ENV !== "production" ||
    !databaseUrl ||
    !isLibsqlDatabaseUrl(databaseUrl) ||
    !env.TURSO_DATABASE_AUTH_TOKEN
  ) {
    return null;
  }

  await mkdir(path.dirname(PUBLIC_SEARCH_BUILD_SOURCE_REPLICA_PATH), {
    recursive: true,
  });

  const client = createClient({
    authToken: env.TURSO_DATABASE_AUTH_TOKEN,
    syncUrl: databaseUrl,
    url: `file:${PUBLIC_SEARCH_BUILD_SOURCE_REPLICA_PATH}`,
  });

  try {
    await client.sync();
  } finally {
    client.close();
  }

  return PUBLIC_SEARCH_BUILD_SOURCE_REPLICA_PATH;
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

function getSearchIndexRefreshIntervalSeconds() {
  const value = env.PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS;
  if (!value) {
    return DEFAULT_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      "PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS must be a non-negative integer.",
    );
  }

  return parsed === 0 ? null : parsed;
}

function isSearchIndexRefreshEnabled() {
  return getSearchIndexRefreshIntervalSeconds() !== null;
}

function getStatusFromAge(
  ageSeconds: number | null,
  schemaVersion: string | null,
) {
  if (schemaVersion !== EXPECTED_SEARCH_INDEX_SCHEMA_VERSION) {
    return "expired" satisfies PublicSearchIndexStatus["status"];
  }

  if (ageSeconds === null) {
    return "expired" satisfies PublicSearchIndexStatus["status"];
  }

  const refreshIntervalSeconds = getSearchIndexRefreshIntervalSeconds();
  if (refreshIntervalSeconds === null) {
    return "stale" satisfies PublicSearchIndexStatus["status"];
  }

  if (ageSeconds < refreshIntervalSeconds) {
    return "fresh" satisfies PublicSearchIndexStatus["status"];
  }

  if (ageSeconds < SEARCH_INDEX_MAX_STALE_SECONDS) {
    return "stale" satisfies PublicSearchIndexStatus["status"];
  }

  return "expired" satisfies PublicSearchIndexStatus["status"];
}

function toStringOrNull(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function querySearchIndexMeta(dbPath: string) {
  const client = createClient({ url: `file:${dbPath}` });

  try {
    const [metaResult, cultivarCountResult, listingCountResult] =
      await Promise.all([
        client.execute("SELECT key, value FROM SearchIndexMeta"),
        client.execute("SELECT COUNT(*) AS count FROM CultivarSearchIndex"),
        client.execute(
          "SELECT COUNT(*) AS count FROM CultivarListingSearchIndex",
        ),
      ]);

    const meta = metaResult.rows.reduce<SearchIndexMeta>(
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
        cultivars: Number(cultivarCountResult.rows[0]?.count ?? 0),
        linkedListings: Number(listingCountResult.rows[0]?.count ?? 0),
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
    return Date.now() - lockStat.mtimeMs < SEARCH_INDEX_REFRESH_LOCK_STALE_MS;
  } catch (error) {
    if (isMissingFileError(error)) {
      return false;
    }

    throw error;
  }
}

async function getPublicSearchIndexStatus(): Promise<PublicSearchIndexStatus> {
  const dbPath = getPublicSearchIndexPath();

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
        Boolean(globalForPublicSearchIndex.publicSearchIndexRefreshPromise) ||
        (await hasActiveRefreshLock()),
      schemaVersion: null,
      sourcePath: null,
      status: "missing",
    };
  }

  const { counts, meta } = await querySearchIndexMeta(dbPath);
  const ageSeconds = getAgeSeconds(meta.builtAt);

  return {
    ageSeconds,
    builtAt: meta.builtAt,
    counts,
    exists: true,
    path: dbPath,
    refreshing:
      Boolean(globalForPublicSearchIndex.publicSearchIndexRefreshPromise) ||
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
    if (Date.now() - lockStat.mtimeMs < SEARCH_INDEX_REFRESH_LOCK_STALE_MS) {
      return null;
    }

    await unlink(lockPath);
    return acquireRefreshLock();
  }
}

function logSearchIndex(event: string, payload: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({
      component: "public-search-index",
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    }),
  );
}

async function refreshPublicSearchIndex(): Promise<PublicSearchIndexStatus> {
  globalForPublicSearchIndex.publicSearchIndexRefreshPromise ??= (async () => {
    const releaseLock = await acquireRefreshLock();

    if (!releaseLock) {
      logSearchIndex("public_search_index_refresh_skipped_locked");
      return getPublicSearchIndexStatus();
    }

    try {
      const sourcePath = await preparePublicSearchBuildSource();
      const buildArgs = [getBuildScriptPath()];

      if (sourcePath) {
        buildArgs.push("--source", sourcePath);
      }

      buildArgs.push("--target", getPublicSearchIndexPath());

      logSearchIndex("public_search_index_build_started", {
        path: getPublicSearchIndexPath(),
        sourcePath,
      });

      const { stdout, stderr } = await execFileAsync(
        process.execPath,
        buildArgs,
        {
          cwd: getAppRoot(),
          env: process.env,
          maxBuffer: 1024 * 1024,
        },
      );

      if (stdout.trim().length > 0) {
        logSearchIndex("public_search_index_build_stdout", {
          output: stdout.trim(),
        });
      }

      if (stderr.trim().length > 0) {
        logSearchIndex("public_search_index_build_stderr", {
          output: stderr.trim(),
        });
      }

      const status = await getPublicSearchIndexStatus();
      logSearchIndex("public_search_index_build_succeeded", {
        ageSeconds: status.ageSeconds,
        counts: status.counts,
        path: status.path,
      });

      return status;
    } catch (error) {
      logSearchIndex("public_search_index_build_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await releaseLock();
    }
  })().finally(() => {
    globalForPublicSearchIndex.publicSearchIndexRefreshPromise = undefined;
  });

  return globalForPublicSearchIndex.publicSearchIndexRefreshPromise;
}

export async function ensurePublicSearchIndex() {
  const status = await getPublicSearchIndexStatus();

  if (!isSearchIndexRefreshEnabled()) {
    return status;
  }

  if (!status.exists) {
    return refreshPublicSearchIndex();
  }

  if (status.status === "expired") {
    return refreshPublicSearchIndex();
  }

  if (status.status === "stale") {
    void refreshPublicSearchIndex().catch(() => undefined);
  }

  return status;
}

export function isPublicSearchIndexUsable(status: PublicSearchIndexStatus) {
  return status.exists && status.status !== "expired";
}
