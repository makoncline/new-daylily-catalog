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

import {
  searchCultivarFacetValues,
  searchCultivars,
} from "@/server/search/cultivar-search";

describe("cultivar search", () => {
  let tempDirectory = "";

  beforeAll(async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), "cultivar-search-test-"));
    searchIndexState.path = path.join(tempDirectory, "search.sqlite");
    const client = createClient({ url: `file:${searchIndexState.path}` });

    await client.executeMultiple(`
      CREATE TABLE CultivarSearchIndex (
        id INTEGER PRIMARY KEY,
        cultivarReferenceId TEXT NOT NULL,
        v2AhsCultivarId TEXT,
        normalizedName TEXT NOT NULL,
        displayName TEXT NOT NULL,
        displayNameSearch TEXT NOT NULL,
        hybridizer TEXT,
        hybridizerSearch TEXT,
        yearInt INTEGER,
        seedlingNumber TEXT,
        scapeHeightIn REAL,
        bloomSizeIn REAL,
        budCount INTEGER,
        branches INTEGER,
        bloomSeason TEXT,
        bloomHabit TEXT,
        form TEXT,
        ploidy TEXT,
        foliageType TEXT,
        fragrance TEXT,
        color TEXT,
        parentage TEXT,
        rebloom INTEGER,
        doublePercentage REAL,
        polymerousPercentage REAL,
        spiderRatio REAL,
        petalLengthIn REAL,
        petalWidthIn REAL,
        awardNames TEXT,
        awardsJson TEXT,
        imageUrl TEXT,
        generatedImageAssetId TEXT,
        generatedImageUrl TEXT,
        generatedOriginalUrl TEXT,
        generatedThumbUrl TEXT,
        generatedBlurUrl TEXT,
        fallbackImageUrl TEXT,
        hasImage INTEGER NOT NULL DEFAULT 0,
        listingCount INTEGER NOT NULL DEFAULT 0,
        forSaleListingCount INTEGER NOT NULL DEFAULT 0,
        sourceUpdatedAt TEXT NOT NULL
      );

      CREATE TABLE CultivarSearchFacetValue (
        facet TEXT NOT NULL,
        value TEXT NOT NULL,
        valueSearch TEXT NOT NULL,
        count INTEGER NOT NULL,
        PRIMARY KEY (facet, value)
      );

      CREATE TABLE CultivarSearchAward (
        cultivarId INTEGER NOT NULL,
        valueSearch TEXT NOT NULL,
        PRIMARY KEY (cultivarId, valueSearch)
      );

      CREATE TABLE CultivarListingSearchIndex (
        listingId TEXT NOT NULL,
        cultivarReferenceId TEXT NOT NULL,
        catalogSlugOrId TEXT NOT NULL,
        catalogTitle TEXT,
        listingTitle TEXT NOT NULL,
        listingTitleSearch TEXT NOT NULL,
        listingDescription TEXT,
        listingDescriptionSearch TEXT,
        price REAL,
        forSale INTEGER NOT NULL,
        hasPhoto INTEGER NOT NULL,
        canonicalPath TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      INSERT INTO CultivarSearchIndex (
        id, cultivarReferenceId, normalizedName, displayName,
        displayNameSearch, hybridizer, hybridizerSearch, bloomSeason,
        foliageType, fragrance, rebloom, awardNames, awardsJson,
        generatedImageAssetId, generatedImageUrl, hasImage, listingCount,
        sourceUpdatedAt
      ) VALUES
        (1, 'early', 'early', 'Early', 'early', 'Reed', 'reed', 'Early', 'Evergreen', 'Fragrant', 0, 'HM', '[{"name":"HM","year":"2025","award_url":"https://daylilies.org/award/honorable-mention/"}]', NULL, NULL, 0, 10, '2026-01-01'),
        (2, 'extra-early', 'extra early', 'Extra Early', 'extra early', 'Stone', 'stone', 'Extra Early', 'Semi-Evergreen', 'Very Fragrant', 0, NULL, NULL, NULL, NULL, 1, 0, '2026-01-01'),
        (3, 'early-midseason', 'early midseason', 'Early Midseason', 'early midseason', 'Reed', 'reed', 'Early-Midseason', 'Dormant', NULL, 0, 'Stout|HM', '[{"name":"Stout","year":"2024"},{"name":"HM","year":"2022"}]', 'generated-3', 'https://media.example.com/generated-3.webp', 1, 0, '2026-01-01'),
        (4, 'rebloomer', 'rebloomer', 'Rebloomer', 'rebloomer', 'Apps', 'apps', 'Midseason', 'Dormant', NULL, 1, NULL, NULL, NULL, NULL, 0, 0, '2026-01-01'),
        (5, 'numeric', '50000 watts', '50,000 Watts', '50,000 watts', 'Reed', 'reed', 'Midseason', 'Dormant', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, '2026-01-01');

      INSERT INTO CultivarSearchFacetValue VALUES
        ('hybridizer', 'Reed', 'reed', 3),
        ('hybridizer', 'Stone', 'stone', 1),
        ('hybridizer', 'Pete Harry', 'pete harry', 1),
        ('award', 'HM', 'hm', 2),
        ('award', 'Stout', 'stout', 1);

      INSERT INTO CultivarSearchAward VALUES
        (1, 'hm'),
        (3, 'hm'),
        (3, 'stout');

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

      INSERT INTO CultivarListingSearchIndex VALUES (
        'listing-1', 'early', 'garden', 'Test Garden', 'Early listing',
        'early listing', NULL, NULL, 20, 1, 0, '/garden/early', '2026-01-01'
      );
    `);

    client.close();
  });

  afterAll(async () => {
    await rm(tempDirectory, { force: true, recursive: true });
  });

  it("treats selected facet labels as discrete values", async () => {
    const early = await searchCultivars({
      baseUrl: "https://daylilycatalog.com",
      bloomSeason: "Early",
      includeParentageTrees: false,
      listingLimit: 0,
    });
    const evergreen = await searchCultivars({
      baseUrl: "https://daylilycatalog.com",
      foliageType: "Evergreen",
      includeParentageTrees: false,
      listingLimit: 0,
    });
    const fragrant = await searchCultivars({
      baseUrl: "https://daylilycatalog.com",
      fragrance: "Fragrant",
      includeParentageTrees: false,
      listingLimit: 0,
    });

    expect(early.map((result) => result.cultivarReferenceId)).toEqual([
      "early",
    ]);
    expect(evergreen.map((result) => result.cultivarReferenceId)).toEqual([
      "early",
    ]);
    expect(fragrant.map((result) => result.cultivarReferenceId)).toEqual([
      "early",
    ]);
  });

  it("uses the dedicated rebloom flag for the Rebloom bloom-habit option", async () => {
    const results = await searchCultivars({
      baseUrl: "https://daylilycatalog.com",
      bloomHabit: "Rebloom",
      includeParentageTrees: false,
      listingLimit: 0,
    });

    expect(results.map((result) => result.cultivarReferenceId)).toEqual([
      "rebloomer",
    ]);
  });

  it("boosts generated cultivar images ahead of other photos without filtering results", async () => {
    const boosted = await searchCultivars({
      baseUrl: "https://daylilycatalog.com",
      includeParentageTrees: false,
      listingLimit: 0,
      limit: 4,
      photosFirst: true,
    });
    const unboosted = await searchCultivars({
      baseUrl: "https://daylilycatalog.com",
      includeParentageTrees: false,
      listingLimit: 0,
      limit: 4,
      photosFirst: false,
    });

    expect(boosted.map((result) => result.cultivarReferenceId)).toEqual([
      "early-midseason",
      "extra-early",
      "early",
      "numeric",
    ]);
    expect(unboosted[0]?.cultivarReferenceId).toBe("early");
  });

  it("skips listing-sample expansion when listingLimit is zero", async () => {
    const withoutListings = await searchCultivars({
      baseUrl: "https://daylilycatalog.com",
      cultivarName: "Early",
      includeParentageTrees: false,
      listingLimit: 0,
    });
    const withListings = await searchCultivars({
      baseUrl: "https://daylilycatalog.com",
      cultivarName: "Early",
      includeParentageTrees: false,
      listingLimit: 1,
    });

    expect(withoutListings[0]?.catalogListings).toEqual([]);
    expect(withListings[0]?.catalogListings).toHaveLength(1);
  });

  it("supports exact multi-select hybridizers and awards", async () => {
    const results = await searchCultivars({
      award: "HM",
      baseUrl: "https://daylilycatalog.com",
      hybridizer: "Reed|Stone",
      includeParentageTrees: false,
      listingLimit: 0,
      limit: 10,
      sort: "name",
    });

    expect(results.map((result) => result.cultivarReferenceId)).toEqual([
      "early",
      "early-midseason",
    ]);
    expect(results[0]?.traits.awards).toEqual([
      {
        name: "HM",
        url: "https://daylilies.org/award/honorable-mention/",
        year: "2025",
      },
    ]);
  });

  it("sorts letter-leading cultivar names before numeric names", async () => {
    const results = await searchCultivars({
      baseUrl: "https://daylilycatalog.com",
      includeParentageTrees: false,
      listingLimit: 0,
      limit: 10,
      sort: "name",
    });

    expect(results.map((result) => result.cultivarReferenceId)).toEqual([
      "early",
      "early-midseason",
      "extra-early",
      "rebloomer",
      "numeric",
    ]);
  });

  it("returns searchable exact facet options with counts", async () => {
    await expect(
      searchCultivarFacetValues({
        facet: "hybridizer",
        query: "re",
      }),
    ).resolves.toEqual([
      {
        count: 3,
        label: "Reed",
        value: "Reed",
      },
    ]);

    await expect(
      searchCultivarFacetValues({
        facet: "hybridizer",
        query: "harry",
      }),
    ).resolves.toEqual([
      {
        count: 1,
        label: "Pete Harry",
        value: "Pete Harry",
      },
    ]);
  });
});
