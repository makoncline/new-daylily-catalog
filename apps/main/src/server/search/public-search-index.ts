import "server-only";

import { stat } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { env } from "@/env";
import { syncEmbeddedReplica } from "@/server/db";
import { buildPublicSearchIndex } from "@/server/search/build-public-search-index.js";

const DEFAULT_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS = 60 * 60;
const EXPECTED_SEARCH_INDEX_SCHEMA_VERSION = "13";

interface SearchIndexMeta {
  builtAt: string | null;
  sourceLabel: string | null;
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
  sourceLabel: string | null;
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

function getTargetWorkerPath() {
  return path.join(
    getAppRoot(),
    "scripts/build-public-search-index-target.mjs",
  );
}

function isMissingFileError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
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

  return "stale" satisfies PublicSearchIndexStatus["status"];
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
        } else if (key === "sourceLabel") {
          acc.sourceLabel = value;
        } else if (key === "schemaVersion") {
          acc.schemaVersion = value;
        }

        return acc;
      },
      {
        builtAt: null,
        schemaVersion: null,
        sourceLabel: null,
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
      refreshing: Boolean(
        globalForPublicSearchIndex.publicSearchIndexRefreshPromise,
      ),
      schemaVersion: null,
      sourceLabel: null,
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
    refreshing: Boolean(
      globalForPublicSearchIndex.publicSearchIndexRefreshPromise,
    ),
    schemaVersion: meta.schemaVersion,
    sourceLabel: meta.sourceLabel,
    status: getStatusFromAge(ageSeconds, meta.schemaVersion),
  };
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

async function runPublicSearchIndexRefreshAttempt(state: { stage: string }) {
  state.stage = "replica_sync";
  const sourceDb = await syncEmbeddedReplica();
  logSearchIndex("public_search_replica_sync_completed");

  state.stage = "index_build";
  const targetPath = getPublicSearchIndexPath();

  logSearchIndex("public_search_index_build_started", {
    path: targetPath,
    sourceLabel: "embedded-replica",
  });

  const buildResult = await buildPublicSearchIndex({
    sourceDb,
    sourceLabel: "embedded-replica",
    targetPath,
    targetWorkerPath: getTargetWorkerPath(),
  });

  state.stage = "index_status";
  const status = await getPublicSearchIndexStatus();
  if (!isPublicSearchIndexUsable(status)) {
    throw new Error(
      "Public search index build did not produce a usable index.",
    );
  }

  logSearchIndex("public_search_index_build_succeeded", {
    ageSeconds: status.ageSeconds,
    buildElapsedMs: buildResult.elapsedMs,
    counts: status.counts,
    path: status.path,
  });

  return status;
}

async function refreshPublicSearchIndex(): Promise<PublicSearchIndexStatus> {
  globalForPublicSearchIndex.publicSearchIndexRefreshPromise ??= (async () => {
    const state = { stage: "replica_sync" };
    try {
      return await runPublicSearchIndexRefreshAttempt(state);
    } catch (error) {
      logSearchIndex("public_search_index_build_failed", {
        error: error instanceof Error ? error.message : String(error),
        stage: state.stage,
      });
      throw error;
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
