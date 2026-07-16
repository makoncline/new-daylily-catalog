// @vitest-environment node

import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
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
      "ploidy_names" TEXT,
      "foliage_names" TEXT,
      "fragrance_names" TEXT,
      "color" TEXT,
      "parentage" TEXT,
      "rebloom" INTEGER,
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
      "updatedAt"
    ) VALUES
      (
        '102174',
        'Aerial Art',
        'Polymerous|Single|Unusual Form',
        'Crispate',
        'Unusual Form',
        '2026-07-16'
      ),
      (
        'missing',
        'Missing Flower Show',
        'Spider|Single',
        NULL,
        NULL,
        '2026-07-16'
      );
  `);

  db.close();
}

describe("build-public-search-index source selection", () => {
  it("requires an explicit source in production", async () => {
    const error = await runBuildScript([], {
      NODE_ENV: "production",
      TURSO_EMBEDDED_REPLICA_URL: "file:/data/turso-replica.db",
    });

    expect(error).toMatchObject({
      stderr: expect.stringContaining(
        "Production search index builds require an explicit --source path",
      ),
    });
  });

  it("refuses to build from the live embedded replica path", async () => {
    const error = await runBuildScript(["--source", "/data/turso-replica.db"], {
      TURSO_EMBEDDED_REPLICA_URL: "file:/data/turso-replica.db",
    });

    expect(error).toMatchObject({
      stderr: expect.stringContaining(
        "Refusing to build search index from live Turso embedded replica",
      ),
    });
  });

  it("indexes authoritative flower_show without deriving a replacement", async () => {
    const tempDirectory = mkdtempSync(
      path.join(tmpdir(), "public-search-flower-show-"),
    );
    const sourcePath = path.join(tempDirectory, "source.sqlite");
    const targetPath = path.join(tempDirectory, "target.sqlite");

    try {
      createAuthoritativeFlowerShowSource(sourcePath);
      await execFileAsync(
        process.execPath,
        [
          buildScriptPath,
          "--source",
          sourcePath,
          "--target",
          targetPath,
        ],
        { env: process.env },
      );

      const targetDb = new DatabaseSync(targetPath, { readOnly: true });
      const rows = targetDb
        .prepare(
          `SELECT displayName, flowerShow
           FROM CultivarSearchIndex
           ORDER BY displayName`,
        )
        .all();
      targetDb.close();

      expect(rows).toEqual([
        {
          displayName: "Aerial Art",
          flowerShow: "Unusual Form",
        },
        {
          displayName: "Missing Flower Show",
          flowerShow: null,
        },
      ]);
    } finally {
      rmSync(tempDirectory, { force: true, recursive: true });
    }
  });
});
