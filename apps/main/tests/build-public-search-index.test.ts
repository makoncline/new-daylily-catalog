// @vitest-environment node

import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const buildScriptPath = path.join(
  process.cwd(),
  "scripts/build-public-search-index.mjs",
);

async function runBuildScript(args: string[], env: Partial<NodeJS.ProcessEnv>) {
  try {
    await execFileAsync(process.execPath, [buildScriptPath, ...args], {
      env: {
        ...process.env,
        ...env,
      },
    });
  } catch (error) {
    return error;
  }

  throw new Error("Expected build script to fail.");
}

function createAuthoritativeFlowerShowSource(sourcePath: string) {
  const db = new DatabaseSync(sourcePath);

  db.exec(`
    CREATE TABLE "User" ("id" TEXT PRIMARY KEY, "stripeCustomerId" TEXT);
    CREATE TABLE "KeyValue" ("key" TEXT PRIMARY KEY, "value" TEXT);
    CREATE TABLE "Listing" (
      "id" TEXT PRIMARY KEY,
      "cultivarReferenceId" TEXT,
      "userId" TEXT,
      "status" TEXT,
      "price" REAL,
      "title" TEXT,
      "description" TEXT,
      "slug" TEXT,
      "updatedAt" TEXT
    );
    CREATE TABLE "ImageAsset" (
      "id" TEXT PRIMARY KEY,
      "cultivarReferenceId" TEXT,
      "kind" TEXT,
      "status" TEXT,
      "displayUrl" TEXT,
      "originalUrl" TEXT,
      "thumbUrl" TEXT,
      "blurUrl" TEXT,
      "order" INTEGER,
      "createdAt" TEXT
    );
    CREATE TABLE "CultivarReference" (
      "id" TEXT PRIMARY KEY,
      "v2AhsCultivarId" TEXT,
      "normalizedName" TEXT,
      "ahsId" TEXT,
      "updatedAt" TEXT
    );
    CREATE TABLE "V2AhsCultivar" (
      "id" TEXT PRIMARY KEY,
      "post_title" TEXT,
      "primary_hybridizer_name" TEXT,
      "hybridizer_code_legacy" TEXT,
      "introduction_date" TEXT,
      "scape_height_in" REAL,
      "bloom_size_in" REAL,
      "bud_count" INTEGER,
      "branches" INTEGER,
      "bloom_season_names" TEXT,
      "bloom_habit_names" TEXT,
      "flower_form_names" TEXT,
      "unusual_forms_names" TEXT,
      "flower_show" TEXT,
      "sculpted_type_names" TEXT,
      "seedling_number" TEXT,
      "ploidy_names" TEXT,
      "foliage_names" TEXT,
      "fragrance_names" TEXT,
      "color" TEXT,
      "parentage" TEXT,
      "rebloom" INTEGER,
      "double_percentage" REAL,
      "polymerous_percentage" REAL,
      "spider_ratio" REAL,
      "petal_length_in" REAL,
      "petal_width_in" REAL,
      "awards_json" TEXT,
      "image_url" TEXT,
      "updatedAt" TEXT
    );
    CREATE TABLE "AhsListing" ("id" TEXT PRIMARY KEY, "ahsImageUrl" TEXT);
    CREATE TABLE "Image" ("listingId" TEXT);
    CREATE TABLE "UserProfile" ("userId" TEXT, "slug" TEXT, "title" TEXT);

    INSERT INTO "CultivarReference" VALUES
      ('aerial-art', '102174', 'aerial art', NULL, '2026-07-16'),
      ('missing-flower-show', 'missing', 'missing flower show', NULL, '2026-07-16');

    INSERT INTO "V2AhsCultivar" (
      "id",
      "post_title",
      "flower_form_names",
      "unusual_forms_names",
      "flower_show",
      "sculpted_type_names",
      "updatedAt"
    ) VALUES
      (
        '102174',
        'Aerial Art',
        'Polymerous|Single|Unusual Form',
        'Crispate',
        'Unusual Form',
        'Cristate|Pleated',
        '2026-07-16'
      ),
      (
        'missing',
        'Missing Flower Show',
        'Spider|Single',
        NULL,
        NULL,
        NULL,
        '2026-07-16'
      );

    INSERT INTO "User" VALUES ('seller', 'cus_seller');
    INSERT INTO "KeyValue" VALUES (
      'stripe:customer:cus_seller',
      '{"status":"active"}'
    );
    INSERT INTO "UserProfile" VALUES (
      'seller',
      'test-garden',
      'Test Garden'
    );
    INSERT INTO "Listing" VALUES (
      'listing-1',
      'aerial-art',
      'seller',
      'PUBLISHED',
      25,
      'Aerial Art Plant',
      'A plant for sale Second line',
      'aerial-art-plant',
      '2026-07-16'
    );
    INSERT INTO "Image" VALUES ('listing-1');
  `);

  db.close();
}

describe("build-public-search-index", () => {
  it("indexes authoritative flower_show without deriving a replacement", async () => {
    const tempDirectory = mkdtempSync(
      path.join(tmpdir(), "public-search-flower-show-"),
    );
    const sourcePath = path.join(tempDirectory, "source.sqlite");
    const targetPath = path.join(tempDirectory, "target.sqlite");

    try {
      createAuthoritativeFlowerShowSource(sourcePath);
      const oldTargetDb = new DatabaseSync(targetPath);
      oldTargetDb.exec(
        "CREATE TABLE Marker (value TEXT); INSERT INTO Marker VALUES ('old');",
      );
      oldTargetDb.close();

      const { stdout } = await execFileAsync(
        process.execPath,
        [buildScriptPath, "--source", sourcePath, "--target", targetPath],
        { env: process.env },
      );
      expect(stdout).toContain("quickCheck|ok");

      const targetDb = new DatabaseSync(targetPath, { readOnly: true });
      const metadata = targetDb
        .prepare("SELECT key, value FROM SearchIndexMeta ORDER BY key")
        .all() as Array<{ key: string; value: string }>;
      const builtAt = metadata.find((entry) => entry.key === "builtAt")?.value;
      expect(typeof builtAt).toBe("string");
      expect(Number.isNaN(Date.parse(builtAt ?? ""))).toBe(false);
      expect(metadata.filter((entry) => entry.key !== "builtAt")).toEqual([
        { key: "schemaVersion", value: "13" },
        { key: "sourceLabel", value: sourcePath },
      ]);
      const rows = targetDb
        .prepare(
          `SELECT displayName, flowerShow, sculptedTypes
           FROM CultivarSearchIndex
           ORDER BY displayName`,
        )
        .all();
      expect(rows).toEqual([
        {
          displayName: "Aerial Art",
          flowerShow: "Unusual Form",
          sculptedTypes: "Cristate|Pleated",
        },
        {
          displayName: "Missing Flower Show",
          flowerShow: null,
          sculptedTypes: null,
        },
      ]);
      expect(
        targetDb
          .prepare(
            `SELECT value, count
             FROM CultivarSearchFacetValue
             WHERE facet = 'sculptedType'
             ORDER BY value`,
          )
          .all(),
      ).toEqual([
        { value: "Cristate", count: 1 },
        { value: "Pleated", count: 1 },
      ]);
      expect(
        targetDb
          .prepare(
            `SELECT catalogSlugOrId, forSale, hasPhoto
             FROM CultivarListingSearchIndex`,
          )
          .get(),
      ).toEqual({
        catalogSlugOrId: "test-garden",
        forSale: 1,
        hasPhoto: 1,
      });
      targetDb.close();

      const previousDb = new DatabaseSync(`${targetPath}.previous`, {
        readOnly: true,
      });
      expect(previousDb.prepare("SELECT value FROM Marker").get()).toEqual({
        value: "old",
      });
      previousDb.close();
      expect(existsSync(`${targetPath}.next`)).toBe(false);
    } finally {
      rmSync(tempDirectory, { force: true, recursive: true });
    }
  });

  it("preserves the last-known-good index when the source build fails", async () => {
    const tempDirectory = mkdtempSync(
      path.join(tmpdir(), "public-search-source-check-"),
    );
    const sourcePath = path.join(tempDirectory, "source.sqlite");
    const targetPath = path.join(tempDirectory, "target.sqlite");

    try {
      const sourceDb = new DatabaseSync(sourcePath);
      sourceDb.exec("CREATE TABLE IncompleteSource (id TEXT PRIMARY KEY);");
      sourceDb.close();
      const targetDb = new DatabaseSync(targetPath);
      targetDb.exec(
        "CREATE TABLE Marker (value TEXT); INSERT INTO Marker VALUES ('old');",
      );
      targetDb.close();
      const error = await runBuildScript(
        ["--source", sourcePath, "--target", targetPath],
        {},
      );

      expect(error).toBeInstanceOf(Error);
      const preservedTarget = new DatabaseSync(targetPath, { readOnly: true });
      expect(preservedTarget.prepare("SELECT value FROM Marker").get()).toEqual(
        {
          value: "old",
        },
      );
      preservedTarget.close();
      expect(existsSync(`${targetPath}.next`)).toBe(false);
    } finally {
      rmSync(tempDirectory, { force: true, recursive: true });
    }
  });
});
