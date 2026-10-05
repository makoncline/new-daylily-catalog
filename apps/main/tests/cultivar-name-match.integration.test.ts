// @vitest-environment node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const searchIndexState = vi.hoisted(() => ({ path: "" }));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/error-utils", () => ({ reportError: vi.fn() }));

vi.mock("@/server/search/public-search-index", () => ({
  ensurePublicSearchIndex: async () => ({
    status: "fresh",
    path: searchIndexState.path,
  }),
  isPublicSearchIndexUsable: () => true,
  PublicSearchIndexUnavailableError: class PublicSearchIndexUnavailableError extends Error {},
}));

import { matchCultivarNames } from "@/server/search/cultivar-name-match";
import { POST } from "@/app/api/v1/cultivars/match/route";

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
      ), (
        1001, 'gold-lacemaker', 'gold lacemaker', 'Gold Lacemaker', 'gold lacemaker'
      );

      UPDATE CultivarSearchIndex SET
        hybridizer = 'Example',
        awardNames = 'AM|HM',
        yearInt = 2001,
        scapeHeightIn = 32,
        bloomSizeIn = 6.5,
        budCount = 0,
        branches = 0,
        bloomSeason = 'Midseason',
        bloomHabit = 'Diurnal',
        form = 'Unusual Form',
        flowerShow = 'Large',
        sculptedTypes = 'Relief',
        ploidy = 'Tetraploid',
        foliageType = 'Dormant',
        fragrance = 'Fragrant',
        color = 'Lavender with yellow throat',
        parentage = 'Parent One x Parent Two',
        rebloom = 0,
        imageUrl = 'https://example.com/legacy.jpg',
        fallbackImageUrl = 'https://example.com/fallback.jpg'
      WHERE id IN (1000, 1001);

      UPDATE CultivarSearchIndex SET
        generatedImageAssetId = 'blue-vanguard-image',
        generatedImageUrl = 'https://example.com/display.webp',
        generatedOriginalUrl = 'https://example.com/original.png',
        generatedThumbUrl = 'https://example.com/thumb.webp',
        generatedBlurUrl = 'https://example.com/blur.webp'
      WHERE id = 1000;

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

  it.each([
    {
      displayName: "Blue Vanguard",
      cultivarReferenceId: "blue-vanguard",
      typoName: "Blie Vangaurd",
      typoConfidence: 85,
      imageUrl: "https://example.com/display.webp",
      imageAsset: {
        blurUrl: "https://example.com/blur.webp",
        displayUrl: "https://example.com/display.webp",
        id: "blue-vanguard-image",
        originalUrl: "https://example.com/original.png",
        status: "ready",
        thumbUrl: "https://example.com/thumb.webp",
      },
    },
    {
      displayName: "Gold Lacemaker",
      cultivarReferenceId: "gold-lacemaker",
      typoName: "Glod Lacemkaer",
      typoConfidence: 86,
      imageUrl: "https://example.com/fallback.jpg",
      imageAsset: null,
    },
  ])(
    "returns the same $displayName payload through exact, saved-ID, FTS, and typo matching",
    async ({
      displayName,
      cultivarReferenceId,
      typoName,
      typoConfidence,
      imageUrl,
      imageAsset,
    }) => {
      // The prefix excludes the first-letter fallback; both typo tokens miss FTS.
      const response = await POST(
        new Request("http://localhost/api/v1/cultivars/match", {
          body: JSON.stringify({
            cultivarReferenceIds: [null, cultivarReferenceId, null, null],
            includeCandidates: true,
            names: [
              displayName,
              "Seller spelling",
              `The ${displayName}`,
              typoName,
            ],
          }),
          method: "POST",
        }),
      );

      expect(response.status).toBe(200);
      const { results } = await response.json();
      const candidate = {
        awardNames: "AM|HM",
        bloomHabit: "Diurnal",
        bloomSizeIn: 6.5,
        bloomSeason: "Midseason",
        branches: 0,
        budCount: 0,
        color: "Lavender with yellow throat",
        cultivarReferenceId,
        displayName,
        foliageType: "Dormant",
        flowerShow: "Large",
        form: "Unusual Form",
        fragrance: "Fragrant",
        hybridizer: "Example",
        imageAsset,
        imageUrl,
        listingCount: 0,
        normalizedName: displayName.toLowerCase(),
        parentage: "Parent One x Parent Two",
        ploidy: "Tetraploid",
        rebloom: false,
        scapeHeightIn: 32,
        sculptedTypes: "Relief",
        year: 2001,
      };

      for (const result of results.slice(0, 2)) {
        expect(result.exactMatch).toEqual({ ...candidate, confidence: 100 });
        expect(result.candidates).toEqual([result.exactMatch]);
      }
      for (const [index, confidence] of [82, typoConfidence].entries()) {
        expect(results[index + 2].exactMatch).toBeNull();
        expect(results[index + 2].candidates).toEqual([
          { ...candidate, confidence },
        ]);
      }
    },
  );

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
