// @vitest-environment node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const searchIndexState = vi.hoisted(() => ({ path: "" }));

vi.mock("server-only", () => ({}));

vi.mock("@/server/search/public-search-index", () => ({
  ensurePublicSearchIndex: async () => ({ status: "fresh" }),
  getPublicSearchIndexPath: () => searchIndexState.path,
  isPublicSearchIndexUsable: () => true,
  PublicSearchIndexUnavailableError: class PublicSearchIndexUnavailableError extends Error {},
}));

import { matchCultivarNames } from "@/server/search/cultivar-name-match";

describe("cultivar name matching", () => {
  let tempDirectory = "";

  beforeAll(async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), "cultivar-match-test-"));
    searchIndexState.path = path.join(tempDirectory, "search.sqlite");
    const client = createClient({ url: `file:${searchIndexState.path}` });

    await client.executeMultiple(`
      CREATE TABLE CultivarSearchIndex (
        id INTEGER PRIMARY KEY,
        cultivarReferenceId TEXT NOT NULL,
        normalizedName TEXT NOT NULL,
        displayName TEXT NOT NULL,
        displayNameSearch TEXT NOT NULL,
        hybridizer TEXT,
        awardNames TEXT,
        yearInt INTEGER,
        scapeHeightIn REAL,
        bloomSizeIn REAL,
        budCount INTEGER,
        branches INTEGER,
        bloomSeason TEXT,
        bloomHabit TEXT,
        form TEXT,
        flowerShow TEXT,
        sculptedTypes TEXT,
        ploidy TEXT,
        foliageType TEXT,
        fragrance TEXT,
        color TEXT,
        parentage TEXT,
        rebloom INTEGER,
        imageUrl TEXT,
        generatedImageAssetId TEXT,
        generatedImageUrl TEXT,
        generatedOriginalUrl TEXT,
        generatedThumbUrl TEXT,
        generatedBlurUrl TEXT,
        fallbackImageUrl TEXT,
        listingCount INTEGER NOT NULL DEFAULT 0
      );

      WITH RECURSIVE sequence(value) AS (
        SELECT 1
        UNION ALL
        SELECT value + 1 FROM sequence WHERE value < 161
      )
      INSERT INTO CultivarSearchIndex (
        id, cultivarReferenceId, normalizedName, displayName, displayNameSearch
      )
      SELECT
        value,
        'generic-' || value,
        'blue miscellaneous ' || printf('%03d', value),
        'Blue Miscellaneous ' || printf('%03d', value),
        'blue miscellaneous ' || printf('%03d', value)
      FROM sequence;

      INSERT INTO CultivarSearchIndex (
        id, cultivarReferenceId, normalizedName, displayName, displayNameSearch
      ) VALUES (
        1000, 'blue-vanguard', 'blue vanguard', 'Blue Vanguard', 'blue vanguard'
      );

      CREATE VIRTUAL TABLE CultivarSearchFts USING fts5(
        displayName,
        normalizedName,
        hybridizer,
        color,
        parentage,
        awardNames,
        content='CultivarSearchIndex',
        content_rowid='id'
      );

      INSERT INTO CultivarSearchFts(
        rowid, displayName, normalizedName, hybridizer, color, parentage,
        awardNames
      )
      SELECT
        id, displayName, normalizedName, hybridizer, color, parentage,
        awardNames
      FROM CultivarSearchIndex;
    `);

    client.close();
  });

  afterAll(async () => {
    await rm(tempDirectory, { force: true, recursive: true });
  });

  it("uses the typo fallback when generic FTS hits fill the candidate limit", async () => {
    const [result] = await matchCultivarNames({
      includeCandidates: true,
      names: ["Blue Vangaurd"],
    });

    expect(result?.candidates[0]).toMatchObject({
      cultivarReferenceId: "blue-vanguard",
      displayName: "Blue Vanguard",
    });
  });
});
