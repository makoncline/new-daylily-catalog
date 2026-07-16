// @vitest-environment node

import { execFile } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const APP_ROOT = process.cwd();
const RAW_PAGE_FIXTURE_PATH = path.join(
  APP_ROOT,
  "tests/fixtures/v2-ahs-raw-page.json",
);
const SOURCE_FIELD_CONTRACT_PATH = path.join(
  APP_ROOT,
  "scripts/scrape/v2-ahs-source-field-contract.json",
);
const COMBINE_SCRIPT_PATH = path.join(
  APP_ROOT,
  "scripts/scrape/combine-pages-sqlite.sh",
);
const DELTA_SCRIPT_PATH = path.join(
  APP_ROOT,
  "scripts/generate-v2-ahs-cultivar-delta-sql.ts",
);
const IMPORT_SCRIPT_PATH = path.join(
  APP_ROOT,
  "scripts/apply-v2-ahs-cultivar-import.ts",
);
const SCHEMA_MIGRATION_PATH = path.join(
  APP_ROOT,
  "prisma/migrations/20260716203000_add_v2_ahs_source_classification_fields/migration.sql",
);

interface RawPageFixture {
  data: {
    results: Array<Record<string, unknown>>;
  };
}

interface SourceFieldContract {
  ignored: Record<string, { reason: string }>;
  rawCultivarKeyCount: number;
  storedDirectly: string[];
  transformed: Record<string, { reason: string; target: string }>;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

async function combineFixture(tempRoot: string) {
  const pageDirectory = path.join(tempRoot, "pages");
  const combinedDbPath = path.join(tempRoot, "cultivars.db");

  mkdirSync(pageDirectory, { recursive: true });
  copyFileSync(RAW_PAGE_FIXTURE_PATH, path.join(pageDirectory, "page_1.json"));

  await execFileAsync("bash", [COMBINE_SCRIPT_PATH], {
    cwd: path.dirname(COMBINE_SCRIPT_PATH),
    env: {
      ...process.env,
      DB_FILE: combinedDbPath,
      TEMP_DIR: pageDirectory,
    },
  });

  return combinedDbPath;
}

function createPreMigrationProdDb(prodDbPath: string) {
  const db = new DatabaseSync(prodDbPath);

  db.exec(`
    CREATE TABLE "V2AhsCultivar" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "post_id" TEXT,
      "link_normalized_name" TEXT,
      "post_title" TEXT,
      "post_status" TEXT,
      "introduction_date" TEXT,
      "primary_hybridizer_id" TEXT,
      "primary_hybridizer_name" TEXT,
      "additional_hybridizers_ids" TEXT,
      "additional_hybridizers_names" TEXT,
      "hybridizer_code_legacy" TEXT,
      "seedling_number" TEXT,
      "bloom_season_ids" TEXT,
      "bloom_season_names" TEXT,
      "fragrance_ids" TEXT,
      "fragrance_names" TEXT,
      "bloom_habit_ids" TEXT,
      "bloom_habit_names" TEXT,
      "foliage_ids" TEXT,
      "foliage_names" TEXT,
      "ploidy_ids" TEXT,
      "ploidy_names" TEXT,
      "scape_height_in" REAL,
      "bloom_size_in" REAL,
      "bud_count" INTEGER,
      "branches" INTEGER,
      "color" TEXT,
      "rebloom" INTEGER,
      "flower_form_ids" TEXT,
      "flower_form_names" TEXT,
      "double_percentage" REAL,
      "polymerous_percentage" REAL,
      "spider_ratio" REAL,
      "petal_length_in" REAL,
      "petal_width_in" REAL,
      "unusual_forms_ids" TEXT,
      "unusual_forms_names" TEXT,
      "parentage" TEXT,
      "images_count" INTEGER,
      "last_updated" TEXT,
      "image_url" TEXT,
      "awards_json" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
    CREATE TABLE "CultivarReference" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ahsId" TEXT,
      "v2AhsCultivarId" TEXT,
      "normalizedName" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);

  db.close();
}

describe("V2 AHS source ingestion", () => {
  it("accounts for and stores every captured cultivar-level source key", async () => {
    const fixture = readJson<RawPageFixture>(RAW_PAGE_FIXTURE_PATH);
    const contract = readJson<SourceFieldContract>(SOURCE_FIELD_CONTRACT_PATH);
    const documentedKeys = [
      ...contract.storedDirectly,
      ...Object.keys(contract.transformed),
      ...Object.keys(contract.ignored),
    ];

    expect(new Set(documentedKeys).size).toBe(documentedKeys.length);
    expect(contract.rawCultivarKeyCount).toBe(44);

    for (const row of fixture.data.results) {
      expect(Object.keys(row).sort()).toEqual([...documentedKeys].sort());
    }

    for (const transformation of Object.values(contract.transformed)) {
      expect(transformation.target).not.toBe("");
      expect(transformation.reason).not.toBe("");
    }

    for (const ignored of Object.values(contract.ignored)) {
      expect(ignored.reason).not.toBe("");
    }

    const tempRoot = mkdtempSync(path.join(tmpdir(), "v2-ahs-contract-"));

    try {
      const combinedDbPath = await combineFixture(tempRoot);
      const combinedDb = new DatabaseSync(combinedDbPath, { readOnly: true });
      const storedColumns = new Set(
        combinedDb
          .prepare("PRAGMA table_info(cultivars)")
          .all()
          .map((column) => String(column.name)),
      );
      combinedDb.close();

      const contractColumns = [
        ...contract.storedDirectly,
        ...Object.values(contract.transformed).map(
          (transformation) => transformation.target,
        ),
      ];

      expect(
        contractColumns.filter((column) => !storedColumns.has(column)),
      ).toEqual([]);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  it("preserves flower_show and sculpted fields through combine, delta, import, and Prisma", async () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "v2-ahs-refresh-"));
    let prisma: PrismaClient | null = null;

    try {
      const combinedDbPath = await combineFixture(tempRoot);
      const combinedDb = new DatabaseSync(combinedDbPath, { readOnly: true });
      const combinedRows = combinedDb
        .prepare(
          `SELECT id, flower_show, sculpted_type_ids, sculpted_type_names
           FROM cultivars
           ORDER BY id`,
        )
        .all();
      combinedDb.close();

      expect(combinedRows).toEqual([
        {
          flower_show: "Unusual Form",
          id: "102174",
          sculpted_type_ids: null,
          sculpted_type_names: null,
        },
        {
          flower_show: "Large",
          id: "81276",
          sculpted_type_ids: "229,212",
          sculpted_type_names: "Cristate|Pleated",
        },
      ]);

      const prodDbPath = path.join(tempRoot, "prod.sqlite");
      createPreMigrationProdDb(prodDbPath);

      const deltaOutputPath = path.join(tempRoot, "delta");
      await execFileAsync(
        process.execPath,
        [
          DELTA_SCRIPT_PATH,
          "--prod-db",
          prodDbPath,
          "--source-db",
          combinedDbPath,
          "--output-dir",
          deltaOutputPath,
        ],
        { cwd: APP_ROOT },
      );

      const summary = readJson<{ counts: { newRows: number; rowsNeedingUpsert: number } }>(
        path.join(deltaOutputPath, "summary.json"),
      );
      expect(summary.counts).toMatchObject({
        newRows: 2,
        rowsNeedingUpsert: 2,
      });

      const migrationDb = new DatabaseSync(prodDbPath);
      migrationDb.exec(readFileSync(SCHEMA_MIGRATION_PATH, "utf8"));
      migrationDb.close();

      await execFileAsync(
        process.execPath,
        [
          IMPORT_SCRIPT_PATH,
          "--sqlite",
          prodDbPath,
          "--import-dir",
          path.join(deltaOutputPath, "upsert"),
        ],
        { cwd: APP_ROOT },
      );

      prisma = new PrismaClient({
        adapter: new PrismaLibSql(
          { url: `file:${prodDbPath}` },
          { timestampFormat: "unixepoch-ms" },
        ),
      });
      await prisma.$connect();

      const importedRows = await prisma.v2AhsCultivar.findMany({
        orderBy: { id: "asc" },
        select: {
          flower_show: true,
          id: true,
          sculpted_type_ids: true,
          sculpted_type_names: true,
        },
      });

      expect(importedRows).toEqual([
        {
          flower_show: "Unusual Form",
          id: "102174",
          sculpted_type_ids: null,
          sculpted_type_names: null,
        },
        {
          flower_show: "Large",
          id: "81276",
          sculpted_type_ids: "229,212",
          sculpted_type_names: "Cristate|Pleated",
        },
      ]);
    } finally {
      await prisma?.$disconnect();
      rmSync(tempRoot, { force: true, recursive: true });
    }
  }, 30_000);
});
