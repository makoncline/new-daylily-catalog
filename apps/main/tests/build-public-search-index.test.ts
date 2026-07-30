// @vitest-environment node

import { execFile, execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
  `);

  db.close();
}

function createFailingSourceCheckSqlite(binDirectory: string) {
  const sqlitePath = execFileSync("which", ["sqlite3"], {
    encoding: "utf8",
  }).trim();
  const wrapperPath = path.join(binDirectory, "sqlite3");

  writeFileSync(
    wrapperPath,
    [
      "#!/bin/sh",
      'if [ "$1" = "$FAIL_SOURCE_PATH" ] && [ "$2" = "PRAGMA quick_check;" ]; then',
      '  echo "database disk image is malformed" >&2',
      "  exit 11",
      "fi",
      `exec "${sqlitePath}" "$@"`,
      "",
    ].join("\n"),
  );
  chmodSync(wrapperPath, 0o755);
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
      const { stdout } = await execFileAsync(
        process.execPath,
        [buildScriptPath, "--source", sourcePath, "--target", targetPath],
        { env: process.env },
      );
      expect(stdout).toContain("Source quick_check: ok");

      const targetDb = new DatabaseSync(targetPath, { readOnly: true });
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
      targetDb.close();
    } finally {
      rmSync(tempDirectory, { force: true, recursive: true });
    }
  });

  it("does not promote an index when the final source check fails", async () => {
    const tempDirectory = mkdtempSync(
      path.join(tmpdir(), "public-search-source-check-"),
    );
    const sourcePath = path.join(tempDirectory, "source.sqlite");
    const targetPath = path.join(tempDirectory, "target.sqlite");

    try {
      createAuthoritativeFlowerShowSource(sourcePath);
      const targetDb = new DatabaseSync(targetPath);
      targetDb.exec(
        "CREATE TABLE Marker (value TEXT); INSERT INTO Marker VALUES ('old');",
      );
      targetDb.close();
      createFailingSourceCheckSqlite(tempDirectory);

      const error = await runBuildScript(
        ["--source", sourcePath, "--target", targetPath],
        {
          FAIL_SOURCE_PATH: sourcePath,
          PATH: `${tempDirectory}:${process.env.PATH}`,
        },
      );

      expect(error).toMatchObject({
        stderr: expect.stringContaining(
          "Source replica post_build quick_check failed",
        ),
      });
      const preservedTarget = new DatabaseSync(targetPath, { readOnly: true });
      expect(preservedTarget.prepare("SELECT value FROM Marker").get()).toEqual(
        {
          value: "old",
        },
      );
      preservedTarget.close();
    } finally {
      rmSync(tempDirectory, { force: true, recursive: true });
    }
  });
});
