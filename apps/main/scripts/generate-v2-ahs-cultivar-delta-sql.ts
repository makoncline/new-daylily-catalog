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

interface ComparableCultivarRow {
  id: string;
  post_id: string | null;
  link_normalized_name: string | null;
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

interface CultivarReferenceRow {
  id: string;
  ahsId: string | null;
  v2AhsCultivarId: string | null;
  normalizedName: string | null;
}

interface ChangedRowSummary {
  id: string;
  changedColumns: string[];
  postTitleBefore: string | null;
  postTitleAfter: string | null;
  normalizedNameBefore: string | null;
  normalizedNameAfter: string | null;
  linkedCultivarReferenceId: string | null;
  linkedCultivarReferenceAhsId: string | null;
  linkedCultivarReferenceNormalizedName: string | null;
  cultivarReferenceRenameWouldBeSafe: boolean;
  cultivarReferenceRenameNeedsReview: boolean;
}

interface NewRowSummary {
  id: string;
  postTitle: string | null;
  normalizedName: string | null;
  introductionDate: string | null;
  lastUpdated: string | null;
  existingCultivarReferenceIdByName: string | null;
  existingCultivarReferenceV2IdByName: string | null;
  action: "link-existing-reference" | "create-reference" | "conflict" | "skip-missing-normalized-name";
}

interface DeltaSummary {
  prodDbPath: string;
  sourceDbPath: string;
  generatedAt: string;
  counts: {
    prodV2Rows: number;
    sourceRows: number;
    newRows: number;
    changedRows: number;
    unchangedRows: number;
    prodOnlyRows: number;
    rowsNeedingUpsert: number;
    newRowsLinkExistingReference: number;
    newRowsCreateReference: number;
    newRowsConflict: number;
    newRowsMissingNormalizedName: number;
    changedRowsWithLinkedReferenceNameDrift: number;
    changedRowsWithSafeReferenceRename: number;
    changedRowsWithReviewRequired: number;
  };
  prodOnlyIds: string[];
  newRows: NewRowSummary[];
  changedRows: ChangedRowSummary[];
}

interface ImportChunkMetadata {
  fileName: string;
  rowCount: number;
  batchCount: number;
  sizeBytes: number;
}

interface ParsedArgs {
  prodDbPath: string;
  sourceDbPath: string;
  outputDir: string;
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_SOURCE_DB_PATH = path.join(REPO_ROOT, "cultivars.db");
const DEFAULT_PROD_DB_PATH = path.join(
  REPO_ROOT,
  "prisma",
  "local-prod-copy-daylily-catalog.db",
);
const DEFAULT_OUTPUT_DIR = path.join(
  REPO_ROOT,
  "prisma",
  "data-migrations",
  "v2-ahs-cultivar-delta",
);
const UPSERT_DIR_NAME = "upsert";
const LINK_FILE_NAME = "link-new-cultivar-references.sql";
const VERIFY_FILE_NAME = "verify.sql";
const REVIEW_FILE_NAME = "review-linked-name-drift.sql";
const SUMMARY_FILE_NAME = "summary.json";
const BATCH_SIZE = 200;
const MAX_BATCHES_PER_IMPORT_CHUNK = 32;
const IMPORT_MANIFEST_FILE_NAME = "manifest.json";
const COMPARABLE_COLUMNS = [
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
const INSERT_COLUMNS = [
  "id",
  ...COMPARABLE_COLUMNS,
  "createdAt",
  "updatedAt",
] as const;
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
const PROD_SELECT_SQL = `
  SELECT
    id,
    post_id,
    link_normalized_name,
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
  FROM "V2AhsCultivar"
  ORDER BY id
`;
const CULTIVAR_REFERENCE_SELECT_SQL = `
  SELECT
    id,
    ahsId,
    v2AhsCultivarId,
    normalizedName
  FROM "CultivarReference"
`;

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  let prodDbPath = DEFAULT_PROD_DB_PATH;
  let sourceDbPath = DEFAULT_SOURCE_DB_PATH;
  let outputDir = DEFAULT_OUTPUT_DIR;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (!arg) {
      continue;
    }

    if (arg === "--prod-db") {
      prodDbPath = path.resolve(REPO_ROOT, args[i + 1] ?? "");
      i += 1;
      continue;
    }

    if (arg.startsWith("--prod-db=")) {
      prodDbPath = path.resolve(REPO_ROOT, arg.slice("--prod-db=".length));
      continue;
    }

    if (arg === "--source-db") {
      sourceDbPath = path.resolve(REPO_ROOT, args[i + 1] ?? "");
      i += 1;
      continue;
    }

    if (arg.startsWith("--source-db=")) {
      sourceDbPath = path.resolve(REPO_ROOT, arg.slice("--source-db=".length));
      continue;
    }

    if (arg === "--output-dir") {
      outputDir = path.resolve(REPO_ROOT, args[i + 1] ?? "");
      i += 1;
      continue;
    }

    if (arg.startsWith("--output-dir=")) {
      outputDir = path.resolve(REPO_ROOT, arg.slice("--output-dir=".length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!fs.existsSync(prodDbPath)) {
    throw new Error(`Prod DB not found at ${prodDbPath}`);
  }

  if (!fs.existsSync(sourceDbPath)) {
    throw new Error(`Source DB not found at ${sourceDbPath}`);
  }

  return {
    prodDbPath,
    sourceDbPath,
    outputDir,
  };
}

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

function normalizeSql(contents: string) {
  return `${contents.trim()}\n`;
}

function buildComparableRow(row: SourceCultivarRow): ComparableCultivarRow {
  return {
    id: row.id,
    post_id: row.post_id,
    link_normalized_name: normalizeCultivarName(row.post_title),
    post_title: row.post_title,
    post_status: row.post_status,
    introduction_date: row.introduction_date,
    primary_hybridizer_id: row.primary_hybridizer_id,
    primary_hybridizer_name: row.primary_hybridizer_name,
    additional_hybridizers_ids: row.additional_hybridizers_ids,
    additional_hybridizers_names: row.additional_hybridizers_names,
    hybridizer_code_legacy: row.hybridizer_code_legacy,
    seedling_number: row.seedling_number,
    bloom_season_ids: row.bloom_season_ids,
    bloom_season_names: row.bloom_season_names,
    fragrance_ids: row.fragrance_ids,
    fragrance_names: row.fragrance_names,
    bloom_habit_ids: row.bloom_habit_ids,
    bloom_habit_names: row.bloom_habit_names,
    foliage_ids: row.foliage_ids,
    foliage_names: row.foliage_names,
    ploidy_ids: row.ploidy_ids,
    ploidy_names: row.ploidy_names,
    scape_height_in: row.scape_height_in,
    bloom_size_in: row.bloom_size_in,
    bud_count: row.bud_count,
    branches: row.branches,
    color: row.color,
    rebloom: row.rebloom,
    flower_form_ids: row.flower_form_ids,
    flower_form_names: row.flower_form_names,
    double_percentage: row.double_percentage,
    polymerous_percentage: row.polymerous_percentage,
    spider_ratio: row.spider_ratio,
    petal_length_in: row.petal_length_in,
    petal_width_in: row.petal_width_in,
    unusual_forms_ids: row.unusual_forms_ids,
    unusual_forms_names: row.unusual_forms_names,
    parentage: row.parentage,
    images_count: row.images_count,
    last_updated: row.last_updated,
    image_url: row.image_url,
    awards_json: row.awards_json,
  };
}

function readSourceRows(sourceDbPath: string) {
  const sourceDb = new DatabaseSync(sourceDbPath, { readOnly: true });

  try {
    const rows = sourceDb.prepare(SOURCE_SELECT_SQL).all() as unknown as SourceCultivarRow[];

    return rows.map(buildComparableRow);
  } finally {
    sourceDb.close();
  }
}

function readProdRows(prodDbPath: string) {
  const prodDb = new DatabaseSync(prodDbPath, { readOnly: true });

  try {
    return prodDb
      .prepare(PROD_SELECT_SQL)
      .all() as unknown as ComparableCultivarRow[];
  } finally {
    prodDb.close();
  }
}

function readCultivarReferences(prodDbPath: string) {
  const prodDb = new DatabaseSync(prodDbPath, { readOnly: true });

  try {
    return prodDb
      .prepare(CULTIVAR_REFERENCE_SELECT_SQL)
      .all() as unknown as CultivarReferenceRow[];
  } finally {
    prodDb.close();
  }
}

function diffComparableRows(
  current: ComparableCultivarRow,
  next: ComparableCultivarRow,
) {
  const changedColumns: string[] = [];

  COMPARABLE_COLUMNS.forEach((column) => {
    if (current[column] !== next[column]) {
      changedColumns.push(column);
    }
  });

  return changedColumns;
}

function buildImportRowSql(row: ComparableCultivarRow) {
  const values = [
    row.id,
    row.post_id,
    row.link_normalized_name,
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

function buildImportStatement(rows: string[]) {
  const columnList = INSERT_COLUMNS.map((column) => `"${column}"`).join(", ");
  const updateList = COMPARABLE_COLUMNS.map(
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

function buildImportHeader(summary: DeltaSummary) {
  return `-- Generated by scripts/generate-v2-ahs-cultivar-delta-sql.ts
-- Prod DB: ${summary.prodDbPath}
-- Source DB: ${summary.sourceDbPath}
-- Rows needing upsert: ${summary.counts.rowsNeedingUpsert}
-- New rows: ${summary.counts.newRows}
-- Changed rows: ${summary.counts.changedRows}

BEGIN TRANSACTION;
`;
}

function writeUpsertArtifacts(
  outputDir: string,
  summary: DeltaSummary,
  rows: ComparableCultivarRow[],
) {
  const importDir = path.join(outputDir, UPSERT_DIR_NAME);
  const chunkMetadata: ImportChunkMetadata[] = [];
  let rowCount = 0;
  let batchCount = 0;
  let chunkRowCount = 0;
  let chunkBatchCount = 0;
  let batchRows: string[] = [];
  let chunkStatements: string[] = [];

  fs.mkdirSync(importDir, { recursive: true });

  function flushChunk() {
    if (chunkStatements.length === 0) {
      return;
    }

    const fileName = `chunk-${String(chunkMetadata.length + 1).padStart(4, "0")}.sql`;
    const contents = normalizeSql(`
${buildImportHeader(summary)}
${chunkStatements.join("\n")}

COMMIT;
`);
    const outputPath = path.join(importDir, fileName);
    fs.writeFileSync(outputPath, contents, "utf8");
    chunkMetadata.push({
      fileName,
      rowCount: chunkRowCount,
      batchCount: chunkBatchCount,
      sizeBytes: Buffer.byteLength(contents, "utf8"),
    });
    chunkStatements = [];
    chunkRowCount = 0;
    chunkBatchCount = 0;
  }

  rows.forEach((row) => {
    batchRows.push(buildImportRowSql(row));
    rowCount += 1;

    if (batchRows.length < BATCH_SIZE) {
      return;
    }

    chunkStatements.push(buildImportStatement(batchRows));
    batchRows = [];
    batchCount += 1;
    chunkBatchCount += 1;
    chunkRowCount += BATCH_SIZE;

    if (chunkBatchCount >= MAX_BATCHES_PER_IMPORT_CHUNK) {
      flushChunk();
    }
  });

  if (batchRows.length > 0) {
    chunkStatements.push(buildImportStatement(batchRows));
    batchCount += 1;
    chunkBatchCount += 1;
    chunkRowCount += batchRows.length;
  }

  flushChunk();

  const manifest = {
    prodDbPath: summary.prodDbPath,
    sourceDbPath: summary.sourceDbPath,
    totalRows: rowCount,
    totalBatches: batchCount,
    batchSize: BATCH_SIZE,
    maxBatchesPerChunk: MAX_BATCHES_PER_IMPORT_CHUNK,
    chunkCount: chunkMetadata.length,
    chunks: chunkMetadata,
  };
  const manifestPath = path.join(importDir, IMPORT_MANIFEST_FILE_NAME);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function buildSingleColumnValuesCte(name: string, values: string[]) {
  if (values.length === 0) {
    return `"${name}"("id") AS (
  SELECT NULL AS "id" WHERE 1 = 0
)`;
  }

  const rows = values.map((value) => `  (${toSqlValue(value)})`).join(",\n");
  return `"${name}"("id") AS (
  VALUES
${rows}
)`;
}

function buildChangedNameCte(
  name: string,
  rows: Array<{ id: string; expectedNormalizedName: string | null }>,
) {
  if (rows.length === 0) {
    return `"${name}"("id", "expected_normalized_name") AS (
  SELECT NULL AS "id", NULL AS "expected_normalized_name" WHERE 1 = 0
)`;
  }

  const values = rows
    .map(
      (row) =>
        `  (${toSqlValue(row.id)}, ${toSqlValue(row.expectedNormalizedName)})`,
    )
    .join(",\n");
  return `"${name}"("id", "expected_normalized_name") AS (
  VALUES
${values}
)`;
}

function buildChangedReferenceRenameCte(
  name: string,
  rows: Array<{
    cultivarReferenceId: string;
    expectedNormalizedName: string;
  }>,
) {
  if (rows.length === 0) {
    return `"${name}"("cultivar_reference_id", "expected_normalized_name") AS (
  SELECT NULL AS "cultivar_reference_id", NULL AS "expected_normalized_name" WHERE 1 = 0
)`;
  }

  const values = rows
    .map(
      (row) =>
        `  (${toSqlValue(row.cultivarReferenceId)}, ${toSqlValue(row.expectedNormalizedName)})`,
    )
    .join(",\n");
  return `"${name}"("cultivar_reference_id", "expected_normalized_name") AS (
  VALUES
${values}
)`;
}

function buildLinkSql(newRows: ComparableCultivarRow[], summary: DeltaSummary) {
  const newIds = newRows.map((row) => row.id);
  const deltaIdsCte = buildSingleColumnValuesCte("delta_v2_ids", newIds);
  const renameRows = summary.changedRows
    .filter(
      (row) =>
        row.cultivarReferenceRenameWouldBeSafe &&
        row.linkedCultivarReferenceId != null &&
        row.normalizedNameAfter != null,
    )
    .map((row) => ({
      cultivarReferenceId: row.linkedCultivarReferenceId!,
      expectedNormalizedName: row.normalizedNameAfter!,
    }));
  const renameCte = buildChangedReferenceRenameCte(
    "delta_reference_renames",
    renameRows,
  );

  return normalizeSql(`
-- Generated by scripts/generate-v2-ahs-cultivar-delta-sql.ts
-- Prod DB: ${summary.prodDbPath}
-- Source DB: ${summary.sourceDbPath}
-- New V2 rows in this delta: ${newRows.length}
-- Linked CultivarReference renames in this delta: ${renameRows.length}

BEGIN TRANSACTION;

WITH ${deltaIdsCte}
UPDATE "CultivarReference"
SET
  "v2AhsCultivarId" = (
    SELECT v2."id"
    FROM "V2AhsCultivar" v2
    INNER JOIN "delta_v2_ids" delta
      ON delta."id" = v2."id"
    WHERE v2."link_normalized_name" = "CultivarReference"."normalizedName"
    LIMIT 1
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "normalizedName" IS NOT NULL
  AND "v2AhsCultivarId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "V2AhsCultivar" v2
    INNER JOIN "delta_v2_ids" delta
      ON delta."id" = v2."id"
    WHERE v2."link_normalized_name" = "CultivarReference"."normalizedName"
  );

WITH ${deltaIdsCte}
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
INNER JOIN "delta_v2_ids" delta
  ON delta."id" = v2."id"
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

WITH ${renameCte}
UPDATE "CultivarReference"
SET
  "normalizedName" = (
    SELECT delta."expected_normalized_name"
    FROM "delta_reference_renames" delta
    WHERE delta."cultivar_reference_id" = "CultivarReference"."id"
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (
    SELECT delta."cultivar_reference_id"
    FROM "delta_reference_renames" delta
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "delta_reference_renames" delta
    INNER JOIN "CultivarReference" cr_conflict
      ON cr_conflict."normalizedName" = delta."expected_normalized_name"
    WHERE delta."cultivar_reference_id" = "CultivarReference"."id"
      AND cr_conflict."id" <> "CultivarReference"."id"
  );

COMMIT;
`);
}

function buildVerifySql(
  touchedRows: ComparableCultivarRow[],
  newRows: ComparableCultivarRow[],
  changedRows: ChangedRowSummary[],
  summary: DeltaSummary,
) {
  const touchedIds = touchedRows.map((row) => row.id);
  const newIds = newRows.map((row) => row.id);
  const changedNameRows = changedRows
    .filter(
      (row) =>
        row.normalizedNameBefore !== row.normalizedNameAfter &&
        row.normalizedNameAfter != null,
    )
    .map((row) => ({
      id: row.id,
      expectedNormalizedName: row.normalizedNameAfter,
    }));
  const expectedRemainingMismatches = changedRows.filter(
    (row) =>
      row.normalizedNameBefore !== row.normalizedNameAfter &&
      row.linkedCultivarReferenceId != null &&
      !row.cultivarReferenceRenameWouldBeSafe,
  ).length;
  const touchedIdsCte = buildSingleColumnValuesCte("delta_touched_ids", touchedIds);
  const newIdsCte = buildSingleColumnValuesCte("delta_new_ids", newIds);
  const changedNameCte = buildChangedNameCte(
    "delta_changed_names",
    changedNameRows,
  );

  return normalizeSql(`
-- Generated by scripts/generate-v2-ahs-cultivar-delta-sql.ts
-- Prod DB: ${summary.prodDbPath}
-- Source DB: ${summary.sourceDbPath}

SELECT 'expected_new_rows' AS "check", ${summary.counts.newRows} AS "value";
SELECT 'expected_changed_rows' AS "check", ${summary.counts.changedRows} AS "value";
SELECT 'expected_prod_only_rows' AS "check", ${summary.counts.prodOnlyRows} AS "value";
SELECT 'expected_remaining_name_mismatches_after_apply' AS "check", ${expectedRemainingMismatches} AS "value";

WITH ${touchedIdsCte}
SELECT
  'delta_rows_present_in_v2' AS "check",
  COUNT(*) AS "value"
FROM "V2AhsCultivar" v2
INNER JOIN "delta_touched_ids" delta
  ON delta."id" = v2."id";

WITH ${touchedIdsCte}
SELECT
  'delta_rows_missing_from_v2' AS "check",
  COUNT(*) AS "value"
FROM "delta_touched_ids" delta
LEFT JOIN "V2AhsCultivar" v2
  ON v2."id" = delta."id"
WHERE v2."id" IS NULL;

WITH ${newIdsCte}
SELECT
  'delta_new_rows_linked_in_cultivar_reference' AS "check",
  COUNT(*) AS "value"
FROM "delta_new_ids" delta
INNER JOIN "CultivarReference" cr
  ON cr."v2AhsCultivarId" = delta."id";

WITH ${newIdsCte}
SELECT
  'delta_new_rows_unlinked_in_cultivar_reference' AS "check",
  COUNT(*) AS "value"
FROM "delta_new_ids" delta
LEFT JOIN "CultivarReference" cr
  ON cr."v2AhsCultivarId" = delta."id"
WHERE cr."id" IS NULL;

WITH ${changedNameCte}
SELECT
  'delta_changed_rows_with_cultivar_reference_name_mismatch' AS "check",
  COUNT(*) AS "value"
FROM "delta_changed_names" delta
INNER JOIN "CultivarReference" cr
  ON cr."v2AhsCultivarId" = delta."id"
WHERE delta."expected_normalized_name" IS NOT NULL
  AND cr."normalizedName" IS NOT NULL
  AND cr."normalizedName" <> delta."expected_normalized_name";

WITH ${newIdsCte}
SELECT
  'delta_new_rows_name_conflict_with_other_v2' AS "check",
  COUNT(*) AS "value"
FROM "delta_new_ids" delta
INNER JOIN "V2AhsCultivar" v2
  ON v2."id" = delta."id"
INNER JOIN "CultivarReference" cr
  ON cr."normalizedName" = v2."link_normalized_name"
WHERE cr."v2AhsCultivarId" IS NOT NULL
  AND cr."v2AhsCultivarId" <> v2."id";
`);
}

function buildReviewSql(changedRows: ChangedRowSummary[], summary: DeltaSummary) {
  const changedNameRows = changedRows
    .filter(
      (row) =>
        row.normalizedNameBefore !== row.normalizedNameAfter &&
        row.normalizedNameAfter != null,
    )
    .map((row) => ({
      id: row.id,
      expectedNormalizedName: row.normalizedNameAfter,
    }));
  const changedNameCte = buildChangedNameCte(
    "delta_changed_names",
    changedNameRows,
  );

  return normalizeSql(`
-- Generated by scripts/generate-v2-ahs-cultivar-delta-sql.ts
-- Prod DB: ${summary.prodDbPath}
-- Source DB: ${summary.sourceDbPath}
-- Review rows where the linked CultivarReference still keeps the older normalized name.

WITH ${changedNameCte}
SELECT
  delta."id" AS "v2_id",
  delta."expected_normalized_name",
  cr."id" AS "cultivar_reference_id",
  cr."ahsId" AS "cultivar_reference_ahs_id",
  cr."normalizedName" AS "current_cultivar_reference_normalized_name",
  v2."post_title",
  v2."last_updated"
FROM "delta_changed_names" delta
INNER JOIN "V2AhsCultivar" v2
  ON v2."id" = delta."id"
LEFT JOIN "CultivarReference" cr
  ON cr."v2AhsCultivarId" = delta."id"
WHERE delta."expected_normalized_name" IS NOT NULL
  AND (
    cr."id" IS NULL
    OR cr."normalizedName" IS NULL
    OR cr."normalizedName" <> delta."expected_normalized_name"
  )
ORDER BY v2."id";
`);
}

function writeFile(filePath: string, contents: string) {
  fs.writeFileSync(filePath, normalizeSql(contents), "utf8");
}

async function main() {
  const args = parseArgs();
  const sourceRows = readSourceRows(args.sourceDbPath);
  const prodRows = readProdRows(args.prodDbPath);
  const cultivarReferences = readCultivarReferences(args.prodDbPath);
  const sourceById = new Map(sourceRows.map((row) => [row.id, row]));
  const prodById = new Map(prodRows.map((row) => [row.id, row]));
  const cultivarReferenceByV2Id = new Map(
    cultivarReferences
      .filter((row) => row.v2AhsCultivarId != null)
      .map((row) => [row.v2AhsCultivarId!, row]),
  );
  const cultivarReferenceByName = new Map(
    cultivarReferences
      .filter((row) => row.normalizedName != null)
      .map((row) => [row.normalizedName!, row]),
  );
  const newRows: ComparableCultivarRow[] = [];
  const changedRowsRaw: Array<{
    current: ComparableCultivarRow;
    next: ComparableCultivarRow;
    changedColumns: string[];
  }> = [];

  sourceRows.forEach((next) => {
    const current = prodById.get(next.id);

    if (!current) {
      newRows.push(next);
      return;
    }

    const changedColumns = diffComparableRows(current, next);
    if (changedColumns.length > 0) {
      changedRowsRaw.push({
        current,
        next,
        changedColumns,
      });
    }
  });

  const prodOnlyIds = prodRows
    .filter((row) => !sourceById.has(row.id))
    .map((row) => row.id);

  const changedRows = changedRowsRaw.map((row) => {
    const linkedCultivarReference =
      cultivarReferenceByV2Id.get(row.next.id) ?? null;
    const targetCultivarReference =
      row.next.link_normalized_name == null
        ? null
        : (cultivarReferenceByName.get(row.next.link_normalized_name) ?? null);
    const hasNormalizedNameChange =
      row.current.link_normalized_name !== row.next.link_normalized_name;
    const cultivarReferenceRenameWouldBeSafe =
      hasNormalizedNameChange &&
      linkedCultivarReference != null &&
      row.next.link_normalized_name != null &&
      (targetCultivarReference == null ||
        targetCultivarReference.id === linkedCultivarReference.id);

    return {
      id: row.next.id,
      changedColumns: row.changedColumns,
      postTitleBefore: row.current.post_title,
      postTitleAfter: row.next.post_title,
      normalizedNameBefore: row.current.link_normalized_name,
      normalizedNameAfter: row.next.link_normalized_name,
      linkedCultivarReferenceId: linkedCultivarReference?.id ?? null,
      linkedCultivarReferenceAhsId: linkedCultivarReference?.ahsId ?? null,
      linkedCultivarReferenceNormalizedName:
        linkedCultivarReference?.normalizedName ?? null,
      cultivarReferenceRenameWouldBeSafe,
      cultivarReferenceRenameNeedsReview:
        hasNormalizedNameChange &&
        linkedCultivarReference != null &&
        !cultivarReferenceRenameWouldBeSafe,
    } satisfies ChangedRowSummary;
  });

  const newRowsSummary = newRows.map((row) => {
    const existingCultivarReference =
      row.link_normalized_name == null
        ? null
        : (cultivarReferenceByName.get(row.link_normalized_name) ?? null);

    let action: NewRowSummary["action"] = "create-reference";
    if (row.link_normalized_name == null) {
      action = "skip-missing-normalized-name";
    } else if (existingCultivarReference == null) {
      action = "create-reference";
    } else if (existingCultivarReference.v2AhsCultivarId == null) {
      action = "link-existing-reference";
    } else {
      action = "conflict";
    }

    return {
      id: row.id,
      postTitle: row.post_title,
      normalizedName: row.link_normalized_name,
      introductionDate: row.introduction_date,
      lastUpdated: row.last_updated,
      existingCultivarReferenceIdByName: existingCultivarReference?.id ?? null,
      existingCultivarReferenceV2IdByName:
        existingCultivarReference?.v2AhsCultivarId ?? null,
      action,
    } satisfies NewRowSummary;
  });

  const summary: DeltaSummary = {
    prodDbPath: args.prodDbPath,
    sourceDbPath: args.sourceDbPath,
    generatedAt: new Date().toISOString(),
    counts: {
      prodV2Rows: prodRows.length,
      sourceRows: sourceRows.length,
      newRows: newRows.length,
      changedRows: changedRows.length,
      unchangedRows: sourceRows.length - newRows.length - changedRows.length,
      prodOnlyRows: prodOnlyIds.length,
      rowsNeedingUpsert: newRows.length + changedRows.length,
      newRowsLinkExistingReference: newRowsSummary.filter(
        (row) => row.action === "link-existing-reference",
      ).length,
      newRowsCreateReference: newRowsSummary.filter(
        (row) => row.action === "create-reference",
      ).length,
      newRowsConflict: newRowsSummary.filter((row) => row.action === "conflict")
        .length,
      newRowsMissingNormalizedName: newRowsSummary.filter(
        (row) => row.action === "skip-missing-normalized-name",
      ).length,
      changedRowsWithLinkedReferenceNameDrift: changedRows.filter(
        (row) =>
          row.normalizedNameBefore !== row.normalizedNameAfter &&
          row.linkedCultivarReferenceId != null,
      ).length,
      changedRowsWithSafeReferenceRename: changedRows.filter(
        (row) => row.cultivarReferenceRenameWouldBeSafe,
      ).length,
      changedRowsWithReviewRequired: changedRows.filter(
        (row) => row.cultivarReferenceRenameNeedsReview,
      ).length,
    },
    prodOnlyIds,
    newRows: newRowsSummary,
    changedRows,
  };

  const touchedRows = [...newRows, ...changedRowsRaw.map((row) => row.next)];

  fs.rmSync(args.outputDir, { recursive: true, force: true });
  fs.mkdirSync(args.outputDir, { recursive: true });

  writeUpsertArtifacts(args.outputDir, summary, touchedRows);
  writeFile(
    path.join(args.outputDir, LINK_FILE_NAME),
    buildLinkSql(newRows, summary),
  );
  writeFile(
    path.join(args.outputDir, VERIFY_FILE_NAME),
    buildVerifySql(touchedRows, newRows, changedRows, summary),
  );
  writeFile(
    path.join(args.outputDir, REVIEW_FILE_NAME),
    buildReviewSql(changedRows, summary),
  );
  fs.writeFileSync(
    path.join(args.outputDir, SUMMARY_FILE_NAME),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );

  console.log(`[delta-sql] output dir ${args.outputDir}`);
  console.log(`[delta-sql] prod V2 rows ${summary.counts.prodV2Rows}`);
  console.log(`[delta-sql] source rows ${summary.counts.sourceRows}`);
  console.log(`[delta-sql] new rows ${summary.counts.newRows}`);
  console.log(`[delta-sql] changed rows ${summary.counts.changedRows}`);
  console.log(`[delta-sql] prod-only rows ${summary.counts.prodOnlyRows}`);
  console.log(
    `[delta-sql] new rows link existing reference ${summary.counts.newRowsLinkExistingReference}`,
  );
  console.log(
    `[delta-sql] new rows create reference ${summary.counts.newRowsCreateReference}`,
  );
  console.log(
    `[delta-sql] new rows conflicting by normalized name ${summary.counts.newRowsConflict}`,
  );
  console.log(
    `[delta-sql] changed rows with linked-name drift ${summary.counts.changedRowsWithLinkedReferenceNameDrift}`,
  );
  console.log(
    `[delta-sql] changed rows safe to rename if desired ${summary.counts.changedRowsWithSafeReferenceRename}`,
  );
  console.log(
    `[delta-sql] changed rows needing review ${summary.counts.changedRowsWithReviewRequired}`,
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
