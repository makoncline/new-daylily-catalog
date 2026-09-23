import "server-only";

import { stat } from "node:fs/promises";
import { createClient } from "@libsql/client";

const EXPECTED_SEARCH_INDEX_SCHEMA_VERSION = "13";

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

const globalForPublicSearchIndex = globalThis as typeof globalThis & {
  publicSearchCandidateBuild?: Promise<unknown>;
};

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

  if (ageSeconds < 24 * 60 * 60) {
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

export async function ensurePublicSearchIndex(): Promise<PublicSearchIndexStatus> {
  // Requests only read the artifact. The VPS timer owns sync and rebuilds.
  const { getPublicSearchCandidatePath } = await import(
    "@/server/search/public-search-candidate"
  );
  const dbPath = getPublicSearchCandidatePath();
  const refreshing = Boolean(
    globalForPublicSearchIndex.publicSearchCandidateBuild,
  );

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
      refreshing,
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
    refreshing,
    schemaVersion: meta.schemaVersion,
    sourcePath: meta.sourcePath,
    status: getStatusFromAge(ageSeconds, meta.schemaVersion),
  };
}

export function isPublicSearchIndexUsable(status: PublicSearchIndexStatus) {
  return status.exists && status.status !== "expired";
}
