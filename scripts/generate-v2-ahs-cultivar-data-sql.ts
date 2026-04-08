import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { normalizeCultivarName } from "../src/lib/utils/cultivar-utils";

interface SourceCultivarRow {
  id: string;
  post_id: string | null;
  post_title: string | null;
  post_status: string | null;
  introduction_date: string | null;
  primary_hybridizer_id: string | null;
  primary_hybridizer_name: string | null;
  additional_hybridizers_ids: string | null;
  additional_hybridizers_names: string | null;
  hybridizer_code_legacy: string | null;
  seedling_number: string | null;
  bloom_season_ids: string | null;
  bloom_season_names: string | null;
  fragrance_ids: string | null;
  fragrance_names: string | null;
  bloom_habit_ids: string | null;
  bloom_habit_names: string | null;
  foliage_ids: string | null;
  foliage_names: string | null;
  ploidy_ids: string | null;
  ploidy_names: string | null;
  scape_height_in: number | null;
  bloom_size_in: number | null;
  bud_count: number | null;
  branches: number | null;
  color: string | null;
  rebloom: number | null;
  flower_form_ids: string | null;
  flower_form_names: string | null;
  double_percentage: number | null;
  polymerous_percentage: number | null;
  spider_ratio: number | null;
  petal_length_in: number | null;
  petal_width_in: number | null;
  unusual_forms_ids: string | null;
  unusual_forms_names: string | null;
  parentage: string | null;
  images_count: number | null;
  last_updated: string | null;
  image_url: string | null;
  awards_json: string | null;
}

interface SqlArtifact {
  fileName: string;
  contents: string;
}

interface ImportChunkMetadata {
  fileName: string;
  rowCount: number;
  batchCount: number;
  sizeBytes: number;
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const OUTPUT_DIR = path.join(REPO_ROOT, "prisma", "data-migrations");
const DEFAULT_SOURCE_DB_PATH = path.join(REPO_ROOT, "cultivars.db");
const IMPORT_DIR_NAME = "20260407_upsert_v2_ahs_cultivars";
const LINK_FILE_NAME = "20260407_backfill_v2_ahs_cultivar_reference.sql";
const VERIFY_FILE_NAME = "20260407_verify_v2_ahs_cultivar_data.sql";
const BATCH_SIZE = 200;
const MAX_BATCHES_PER_IMPORT_CHUNK = 32;
const IMPORT_MANIFEST_FILE_NAME = "manifest.json";
const SOURCE_SELECT_SQL = `
  SELECT
    id,
    post_id,
    post_title,
    post_status,
    introduction_date,
    primary_hybridizer_id,
    primary_hybridizer_name,
    additional_hybridizers_ids,
    additional_hybridizers_names,
    hybridizer_code_legacy,
    seedling_number,
    bloom_season_ids,
    bloom_season_names,
    fragrance_ids,
    fragrance_names,
    bloom_habit_ids,
    bloom_habit_names,
    foliage_ids,
    foliage_names,
    ploidy_ids,
    ploidy_names,
    scape_height_in,
    bloom_size_in,
    bud_count,
    branches,
    color,
    rebloom,
    flower_form_ids,
    flower_form_names,
    double_percentage,
    polymerous_percentage,
    spider_ratio,
    petal_length_in,
    petal_width_in,
    unusual_forms_ids,
    unusual_forms_names,
    parentage,
    images_count,
    last_updated,
    image_url,
    awards_json
  FROM cultivars
  ORDER BY id
`;
const INSERT_COLUMNS = [
  "id",
  "post_id",
  "link_normalized_name",
  "post_title",
  "post_status",
  "introduction_date",
  "primary_hybridizer_id",
  "primary_hybridizer_name",
  "additional_hybridizers_ids",
  "additional_hybridizers_names",
  "hybridizer_code_legacy",
  "seedling_number",
  "bloom_season_ids",
  "bloom_season_names",
  "fragrance_ids",
  "fragrance_names",
  "bloom_habit_ids",
  "bloom_habit_names",
  "foliage_ids",
  "foliage_names",
  "ploidy_ids",
  "ploidy_names",
  "scape_height_in",
  "bloom_size_in",
  "bud_count",
  "branches",
  "color",
  "rebloom",
  "flower_form_ids",
  "flower_form_names",
  "double_percentage",
  "polymerous_percentage",
  "spider_ratio",
  "petal_length_in",
  "petal_width_in",
  "unusual_forms_ids",
  "unusual_forms_names",
  "parentage",
  "images_count",
  "last_updated",
  "image_url",
  "awards_json",
  "createdAt",
  "updatedAt",
] as const;
const UPSERT_UPDATE_COLUMNS = [
  "post_id",
  "link_normalized_name",
  "post_title",
  "post_status",
  "introduction_date",
  "primary_hybridizer_id",
  "primary_hybridizer_name",
  "additional_hybridizers_ids",
  "additional_hybridizers_names",
  "hybridizer_code_legacy",
  "seedling_number",
  "bloom_season_ids",
  "bloom_season_names",
  "fragrance_ids",
  "fragrance_names",
  "bloom_habit_ids",
  "bloom_habit_names",
  "foliage_ids",
  "foliage_names",
  "ploidy_ids",
  "ploidy_names",
  "scape_height_in",
  "bloom_size_in",
  "bud_count",
  "branches",
  "color",
  "rebloom",
  "flower_form_ids",
  "flower_form_names",
  "double_percentage",
  "polymerous_percentage",
  "spider_ratio",
  "petal_length_in",
  "petal_width_in",
  "unusual_forms_ids",
  "unusual_forms_names",
  "parentage",
  "images_count",
  "last_updated",
  "image_url",
  "awards_json",
] as const;

function escapeSqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function toSqlValue(value: number | string | null) {
  if (value == null) {
    return "NULL";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialize non-finite number: ${value}`);
    }

    return Number.isInteger(value) ? String(value) : value.toString();
  }

  return escapeSqlString(value);
}

function readSourceDbPath() {
  const explicitDbArg = process.argv.find((arg) =>
    arg.startsWith("--source-db="),
  );
  if (explicitDbArg) {
    return path.resolve(REPO_ROOT, explicitDbArg.slice("--source-db=".length));
  }

  const explicitDbIndex = process.argv.findIndex((arg) => arg === "--source-db");
  if (explicitDbIndex >= 0) {
    const explicitDbValue = process.argv[explicitDbIndex + 1];
    if (!explicitDbValue) {
      throw new Error("Missing value after --source-db");
    }

    return path.resolve(REPO_ROOT, explicitDbValue);
  }

  return DEFAULT_SOURCE_DB_PATH;
}

function normalizeSql(contents: string) {
  return `${contents.trim()}\n`;
}

function writeStaticArtifact(artifact: SqlArtifact) {
  const filePath = path.join(OUTPUT_DIR, artifact.fileName);
  const next = normalizeSql(artifact.contents);
  const exists = fs.existsSync(filePath);
  const previous = exists ? fs.readFileSync(filePath, "utf8") : null;

  if (previous === next) {
    console.log(`[data-sql] unchanged ${artifact.fileName}`);
    return;
  }

  fs.writeFileSync(filePath, next, "utf8");
  console.log(`[data-sql] ${exists ? "updated" : "created"} ${artifact.fileName}`);
}

function buildImportRowSql(row: SourceCultivarRow) {
  const values = [
    row.id,
    row.post_id,
    normalizeCultivarName(row.post_title),
    row.post_title,
    row.post_status,
    row.introduction_date,
    row.primary_hybridizer_id,
    row.primary_hybridizer_name,
    row.additional_hybridizers_ids,
    row.additional_hybridizers_names,
    row.hybridizer_code_legacy,
    row.seedling_number,
    row.bloom_season_ids,
    row.bloom_season_names,
    row.fragrance_ids,
    row.fragrance_names,
    row.bloom_habit_ids,
    row.bloom_habit_names,
    row.foliage_ids,
    row.foliage_names,
    row.ploidy_ids,
    row.ploidy_names,
    row.scape_height_in,
    row.bloom_size_in,
    row.bud_count,
    row.branches,
    row.color,
    row.rebloom,
    row.flower_form_ids,
    row.flower_form_names,
    row.double_percentage,
    row.polymerous_percentage,
    row.spider_ratio,
    row.petal_length_in,
    row.petal_width_in,
    row.unusual_forms_ids,
    row.unusual_forms_names,
    row.parentage,
    row.images_count,
    row.last_updated,
    row.image_url,
    row.awards_json,
  ].map(toSqlValue);

  values.push("CURRENT_TIMESTAMP", "CURRENT_TIMESTAMP");

  return `  (${values.join(", ")})`;
}

function buildImportHeader(sourceDbPath: string) {
  return `-- Generated by scripts/generate-v2-ahs-cultivar-data-sql.ts
-- Source DB: ${sourceDbPath}

BEGIN TRANSACTION;
`;
}

function buildImportStatement(rows: string[]) {
  const columnList = INSERT_COLUMNS.map((column) => `"${column}"`).join(", ");
  const updateList = UPSERT_UPDATE_COLUMNS.map(
    (column) => `  "${column}" = excluded."${column}"`,
  ).join(",\n");

  return `
INSERT INTO "V2AhsCultivar" (${columnList})
VALUES
${rows.join(",\n")}
ON CONFLICT("id") DO UPDATE SET
${updateList},
  "updatedAt" = CURRENT_TIMESTAMP;
`;
}

async function writeImportArtifact(sourceDbPath: string) {
  const outputDir = path.join(OUTPUT_DIR, IMPORT_DIR_NAME);
  const legacyImportFilePath = path.join(
    OUTPUT_DIR,
    `${IMPORT_DIR_NAME}.sql`,
  );
  const sourceDb = new DatabaseSync(sourceDbPath, { readOnly: true });
  const statement = sourceDb.prepare(SOURCE_SELECT_SQL);

  let rowCount = 0;
  let batchCount = 0;
  let batchRows: string[] = [];
  let chunkRowCount = 0;
  let chunkBatchCount = 0;
  let chunkStatements: string[] = [];
  const chunkMetadata: ImportChunkMetadata[] = [];

  fs.rmSync(legacyImportFilePath, { force: true });
  fs.rmSync(outputDir, { force: true, recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  function flushChunk() {
    if (chunkStatements.length === 0) {
      return;
    }

    const fileName = `chunk-${String(chunkMetadata.length + 1).padStart(4, "0")}.sql`;
    const contents = normalizeSql(`
${buildImportHeader(sourceDbPath)}
${chunkStatements.join("\n")}

COMMIT;

-- Validation helpers:
-- SELECT COUNT(*) FROM "V2AhsCultivar";
-- SELECT COUNT(*) FROM "V2AhsCultivar" WHERE "link_normalized_name" IS NULL;
`);
    const outputPath = path.join(outputDir, fileName);
    fs.writeFileSync(outputPath, contents, "utf8");
    chunkMetadata.push({
      fileName,
      rowCount: chunkRowCount,
      batchCount: chunkBatchCount,
      sizeBytes: Buffer.byteLength(contents, "utf8"),
    });
    chunkRowCount = 0;
    chunkBatchCount = 0;
    chunkStatements = [];
  }

  try {
    for (const row of statement.iterate() as IterableIterator<SourceCultivarRow>) {
      batchRows.push(buildImportRowSql(row));
      rowCount += 1;

      if (batchRows.length < BATCH_SIZE) {
        continue;
      }

      chunkStatements.push(buildImportStatement(batchRows));
      batchRows = [];
      batchCount += 1;
      chunkBatchCount += 1;
      chunkRowCount += BATCH_SIZE;

      if (chunkBatchCount >= MAX_BATCHES_PER_IMPORT_CHUNK) {
        flushChunk();
      }
    }

    if (batchRows.length > 0) {
      chunkStatements.push(buildImportStatement(batchRows));
      batchCount += 1;
      chunkBatchCount += 1;
      chunkRowCount += batchRows.length;
    }

    flushChunk();

    const manifest = {
      sourceDbPath,
      totalRows: rowCount,
      totalBatches: batchCount,
      batchSize: BATCH_SIZE,
      maxBatchesPerChunk: MAX_BATCHES_PER_IMPORT_CHUNK,
      chunkCount: chunkMetadata.length,
      chunks: chunkMetadata,
    };
    const manifestPath = path.join(outputDir, IMPORT_MANIFEST_FILE_NAME);
    fs.writeFileSync(
      manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    console.log(
      `[data-sql] wrote ${IMPORT_DIR_NAME}/ (${rowCount} rows across ${batchCount} batches in ${chunkMetadata.length} chunks)`,
    );
  } finally {
    sourceDb.close();
  }
}

const STATIC_ARTIFACTS: SqlArtifact[] = [
  {
    fileName: LINK_FILE_NAME,
    contents: `
BEGIN TRANSACTION;

UPDATE "CultivarReference"
SET
  "v2AhsCultivarId" = (
    SELECT v2."id"
    FROM "V2AhsCultivar" v2
    WHERE v2."link_normalized_name" = "CultivarReference"."normalizedName"
    LIMIT 1
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "normalizedName" IS NOT NULL
  AND "v2AhsCultivarId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "V2AhsCultivar" v2
    WHERE v2."link_normalized_name" = "CultivarReference"."normalizedName"
  );

INSERT INTO "CultivarReference" (
  "id",
  "ahsId",
  "v2AhsCultivarId",
  "normalizedName",
  "createdAt",
  "updatedAt"
)
SELECT
  'cr-v2-ahs-' || v2."id" AS "id",
  NULL AS "ahsId",
  v2."id" AS "v2AhsCultivarId",
  v2."link_normalized_name" AS "normalizedName",
  CURRENT_TIMESTAMP AS "createdAt",
  CURRENT_TIMESTAMP AS "updatedAt"
FROM "V2AhsCultivar" v2
LEFT JOIN "CultivarReference" cr_by_name
  ON cr_by_name."normalizedName" = v2."link_normalized_name"
LEFT JOIN "CultivarReference" cr_by_v2
  ON cr_by_v2."v2AhsCultivarId" = v2."id"
WHERE v2."link_normalized_name" IS NOT NULL
  AND cr_by_name."id" IS NULL
  AND cr_by_v2."id" IS NULL
ON CONFLICT("id") DO UPDATE SET
  "v2AhsCultivarId" = excluded."v2AhsCultivarId",
  "normalizedName" = excluded."normalizedName",
  "updatedAt" = CURRENT_TIMESTAMP;

COMMIT;

-- Validation helpers:
-- SELECT COUNT(*) FROM "CultivarReference" WHERE "v2AhsCultivarId" IS NOT NULL;
-- SELECT COUNT(*) FROM "CultivarReference" WHERE "ahsId" IS NULL AND "v2AhsCultivarId" IS NOT NULL;
`,
  },
  {
    fileName: VERIFY_FILE_NAME,
    contents: `
SELECT
  'v2_ahs_cultivar_row_count' AS "check",
  COUNT(*) AS "value"
FROM "V2AhsCultivar";

SELECT
  'linked_cultivar_reference_count' AS "check",
  COUNT(*) AS "value"
FROM "CultivarReference"
WHERE "v2AhsCultivarId" IS NOT NULL;

SELECT
  'dual_source_cultivar_reference_count' AS "check",
  COUNT(*) AS "value"
FROM "CultivarReference"
WHERE "ahsId" IS NOT NULL
  AND "v2AhsCultivarId" IS NOT NULL;

SELECT
  'new_v2_only_cultivar_reference_count' AS "check",
  COUNT(*) AS "value"
FROM "CultivarReference"
WHERE "ahsId" IS NULL
  AND "v2AhsCultivarId" IS NOT NULL;

SELECT
  'v2_rows_missing_link_normalized_name' AS "check",
  COUNT(*) AS "value"
FROM "V2AhsCultivar"
WHERE "link_normalized_name" IS NULL
  OR TRIM("link_normalized_name") = '';

SELECT
  'v2_duplicate_link_normalized_name_groups' AS "check",
  COUNT(*) AS "value"
FROM (
  SELECT "link_normalized_name"
  FROM "V2AhsCultivar"
  WHERE "link_normalized_name" IS NOT NULL
    AND TRIM("link_normalized_name") <> ''
  GROUP BY "link_normalized_name"
  HAVING COUNT(*) > 1
);

SELECT
  'v2_unlinked_row_count' AS "check",
  COUNT(*) AS "value"
FROM "V2AhsCultivar" v2
LEFT JOIN "CultivarReference" cr
  ON cr."v2AhsCultivarId" = v2."id"
WHERE cr."id" IS NULL;

SELECT
  'dangling_v2_links' AS "check",
  COUNT(*) AS "value"
FROM "CultivarReference" cr
LEFT JOIN "V2AhsCultivar" v2
  ON v2."id" = cr."v2AhsCultivarId"
WHERE cr."v2AhsCultivarId" IS NOT NULL
  AND v2."id" IS NULL;

SELECT
  'normalized_name_match_already_linked_to_other_v2' AS "check",
  COUNT(*) AS "value"
FROM "V2AhsCultivar" v2
INNER JOIN "CultivarReference" cr
  ON cr."normalizedName" = v2."link_normalized_name"
WHERE cr."v2AhsCultivarId" IS NOT NULL
  AND cr."v2AhsCultivarId" <> v2."id";

SELECT
  'existing_v2_link_name_mismatch_count' AS "check",
  COUNT(*) AS "value"
FROM "CultivarReference" cr
INNER JOIN "V2AhsCultivar" v2
  ON v2."id" = cr."v2AhsCultivarId"
WHERE cr."normalizedName" IS NOT NULL
  AND v2."link_normalized_name" IS NOT NULL
  AND cr."normalizedName" <> v2."link_normalized_name";
`,
  },
];

async function main() {
  const sourceDbPath = readSourceDbPath();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  await writeImportArtifact(sourceDbPath);

  for (const artifact of STATIC_ARTIFACTS) {
    writeStaticArtifact(artifact);
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
