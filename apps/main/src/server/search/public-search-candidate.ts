import "server-only";

import { stat } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { env } from "@/env";
import { syncEmbeddedReplica } from "@/server/db";
import {
  buildPublicSearchIndex,
  SEARCH_INDEX_SCHEMA_VERSION,
} from "@/server/search/build-public-search-index.js";

const state = globalThis as typeof globalThis & {
  publicSearchCandidateBuild?: Promise<
    Awaited<ReturnType<typeof buildPublicSearchIndex>>
  >;
  publicSearchIndexRefreshPromise?: Promise<unknown>;
};

function getAppRoot() {
  const cwd = process.cwd();
  return process.env.NODE_ENV !== "production" || cwd.endsWith("apps/main")
    ? cwd
    : path.join(cwd, "apps/main");
}

export function getPublicSearchCandidatePath() {
  return process.env.NODE_ENV === "production"
    ? "/data/search/public-search-candidate.sqlite"
    : path.join(getAppRoot(), ".tmp/search/public-search-candidate.sqlite");
}

export function buildPublicSearchCandidate() {
  if (
    process.env.NODE_ENV === "production" &&
    env.PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS !== "0"
  ) {
    throw new Error(
      "Pause old search refreshes before building the candidate.",
    );
  }

  state.publicSearchCandidateBuild ??= (async () => {
    // A refresh that began before the operator paused the old builder must finish.
    await state.publicSearchIndexRefreshPromise;
    const sourceDb = await syncEmbeddedReplica();
    return buildPublicSearchIndex({
      sourceDb,
      sourceLabel: "embedded-replica",
      targetPath: getPublicSearchCandidatePath(),
      targetWorkerPath: path.join(
        getAppRoot(),
        "scripts/build-public-search-index-target.mjs",
      ),
    });
  })().finally(() => {
    state.publicSearchCandidateBuild = undefined;
  });
  return state.publicSearchCandidateBuild;
}

export async function checkPublicSearchCandidate() {
  const targetPath = getPublicSearchCandidatePath();
  try {
    await stat(targetPath);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    )
      throw error;
    return {
      exists: false as const,
      building: Boolean(state.publicSearchCandidateBuild),
    };
  }

  const client = createClient({ url: `file:${targetPath}` });
  try {
    await client.execute("PRAGMA query_only = ON");
    const meta = await client.execute("SELECT key, value FROM SearchIndexMeta");
    const integrity = await client.execute("PRAGMA quick_check");
    const counts = await client.execute(`
      SELECT
        (SELECT COUNT(*) FROM CultivarSearchIndex) AS cultivars,
        (SELECT COUNT(*) FROM CultivarListingSearchIndex) AS linkedListings
    `);
    const metadata: Record<string, string> = {};
    for (const row of meta.rows) {
      if (typeof row.key === "string" && typeof row.value === "string") {
        metadata[row.key] = row.value;
      }
    }
    if (
      metadata.schemaVersion !== SEARCH_INDEX_SCHEMA_VERSION ||
      integrity.rows.length !== 1 ||
      integrity.rows[0]?.quick_check !== "ok" ||
      Number(counts.rows[0]?.cultivars) === 0
    ) {
      throw new Error("Candidate index validation failed.");
    }
    return {
      exists: true as const,
      building: Boolean(state.publicSearchCandidateBuild),
      builtAt: metadata.builtAt,
      schemaVersion: metadata.schemaVersion,
      cultivars: Number(counts.rows[0]?.cultivars),
      linkedListings: Number(counts.rows[0]?.linkedListings),
      quickCheck: "ok",
    };
  } finally {
    client.close();
  }
}
