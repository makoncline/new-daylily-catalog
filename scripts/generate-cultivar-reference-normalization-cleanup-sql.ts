import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { normalizeCanonicalText } from "../src/lib/search-normalization";

interface CultivarReferenceSnapshotRow {
  cultivarReferenceId: string;
  ahsId: string;
  currentNormalizedName: string;
  ahsName: string;
  ahsYear: string;
  yearIsReserved: number;
  hasImage: number;
  yearIsFourDigit: number;
  completenessScore: number;
  linkedListingCount: number;
}

interface TargetRow {
  cultivarReferenceId: string;
  nextNormalizedName: string;
}

interface DedupeRow {
  duplicateCultivarReferenceId: string;
  canonicalCultivarReferenceId: string;
  canonicalAhsId: string;
  projectedNormalizedName: string;
}

const DEFAULT_DB_PATH = path.resolve(
  process.cwd(),
  "prisma/local-prod-copy-daylily-catalog.db",
);
const OUTPUT_DIR = path.resolve(process.cwd(), "prisma/data-migrations");
const VERIFY_FILE = path.join(
  OUTPUT_DIR,
  "20260407_verify_cultivar_reference_search_normalization_cleanup.sql",
);
const APPLY_FILE = path.join(
  OUTPUT_DIR,
  "20260407_apply_cultivar_reference_search_normalization_cleanup.sql",
);
const TARGET_CTE_NAME = "targets";
const DEDUPE_MAP_CTE_NAME = "dedupe_map";
const UPDATE_BATCH_SIZE = 500;

function getDbPath(): string {
  const explicitDbArg = process.argv.find((arg) => arg.startsWith("--db="));
  if (explicitDbArg) {
    return path.resolve(process.cwd(), explicitDbArg.slice("--db=".length));
  }

  const explicitDbIndex = process.argv.findIndex((arg) => arg === "--db");
  if (explicitDbIndex >= 0) {
    const explicitDbValue = process.argv[explicitDbIndex + 1];
    if (!explicitDbValue) {
      throw new Error("Missing value after --db");
    }

    return path.resolve(process.cwd(), explicitDbValue);
  }

  return DEFAULT_DB_PATH;
}

function queryCultivarReferenceRows(
  dbPath: string,
): CultivarReferenceSnapshotRow[] {
  const sql = `
    SELECT
      cr."id" AS "cultivarReferenceId",
      cr."ahsId" AS "ahsId",
      cr."normalizedName" AS "currentNormalizedName",
      a."name" AS "ahsName",
      a."year" AS "ahsYear",
      CASE
        WHEN LOWER(COALESCE(a."year", "")) LIKE "%reserved%" THEN 1
        ELSE 0
      END AS "yearIsReserved",
      CASE
        WHEN a."ahsImageUrl" IS NULL OR TRIM(a."ahsImageUrl") = "" THEN 0
        ELSE 1
      END AS "hasImage",
      CASE
        WHEN a."year" GLOB "[1-2][0-9][0-9][0-9]" THEN 1
        ELSE 0
      END AS "yearIsFourDigit",
      (
        CASE WHEN a."hybridizer" IS NOT NULL AND TRIM(a."hybridizer") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."year" IS NOT NULL AND TRIM(a."year") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."scapeHeight" IS NOT NULL AND TRIM(a."scapeHeight") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."bloomSize" IS NOT NULL AND TRIM(a."bloomSize") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."bloomSeason" IS NOT NULL AND TRIM(a."bloomSeason") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."ploidy" IS NOT NULL AND TRIM(a."ploidy") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."foliageType" IS NOT NULL AND TRIM(a."foliageType") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."bloomHabit" IS NOT NULL AND TRIM(a."bloomHabit") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."seedlingNum" IS NOT NULL AND TRIM(a."seedlingNum") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."color" IS NOT NULL AND TRIM(a."color") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."form" IS NOT NULL AND TRIM(a."form") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."parentage" IS NOT NULL AND TRIM(a."parentage") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."ahsImageUrl" IS NOT NULL AND TRIM(a."ahsImageUrl") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."fragrance" IS NOT NULL AND TRIM(a."fragrance") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."budcount" IS NOT NULL AND TRIM(a."budcount") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."branches" IS NOT NULL AND TRIM(a."branches") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."sculpting" IS NOT NULL AND TRIM(a."sculpting") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."foliage" IS NOT NULL AND TRIM(a."foliage") <> "" THEN 1 ELSE 0 END +
        CASE WHEN a."flower" IS NOT NULL AND TRIM(a."flower") <> "" THEN 1 ELSE 0 END
      ) AS "completenessScore",
      (
        SELECT COUNT(*)
        FROM "Listing" l
        WHERE l."cultivarReferenceId" = cr."id"
      ) AS "linkedListingCount"
    FROM "CultivarReference" cr
    INNER JOIN "AhsListing" a
      ON a."id" = cr."ahsId"
    ORDER BY cr."id" ASC;
  `;

  const raw = execFileSync("sqlite3", ["-readonly", "-json", dbPath, sql], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });

  return JSON.parse(raw) as CultivarReferenceSnapshotRow[];
}

function escapeSqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function buildTargetRows(rows: CultivarReferenceSnapshotRow[]): TargetRow[] {
  return rows
    .map((row) => {
      const nextNormalizedName = normalizeCanonicalText(row.ahsName);

      return {
        cultivarReferenceId: row.cultivarReferenceId,
        currentNormalizedName: row.currentNormalizedName,
        nextNormalizedName,
      };
    })
    .filter(
      (row) =>
        row.nextNormalizedName.length > 0 &&
        row.nextNormalizedName !== row.currentNormalizedName,
    )
    .map(({ cultivarReferenceId, nextNormalizedName }) => ({
      cultivarReferenceId,
      nextNormalizedName,
    }))
    .sort((a, b) =>
      a.cultivarReferenceId.localeCompare(b.cultivarReferenceId, "en"),
    );
}

function compareSnapshotRows(
  left: CultivarReferenceSnapshotRow,
  right: CultivarReferenceSnapshotRow,
): number {
  return (
    left.yearIsReserved - right.yearIsReserved ||
    right.completenessScore - left.completenessScore ||
    right.hasImage - left.hasImage ||
    right.yearIsFourDigit - left.yearIsFourDigit ||
    right.linkedListingCount - left.linkedListingCount ||
    Number(right.ahsId) - Number(left.ahsId) ||
    right.cultivarReferenceId.localeCompare(left.cultivarReferenceId, "en")
  );
}

function buildDedupeRows(
  rows: CultivarReferenceSnapshotRow[],
  targetRows: TargetRow[],
): DedupeRow[] {
  const targetNameById = new Map(
    targetRows.map((row) => [row.cultivarReferenceId, row.nextNormalizedName]),
  );
  const projectedGroups = new Map<string, CultivarReferenceSnapshotRow[]>();

  rows.forEach((row) => {
    const projectedNormalizedName =
      targetNameById.get(row.cultivarReferenceId) ?? row.currentNormalizedName;

    const existing = projectedGroups.get(projectedNormalizedName) ?? [];
    existing.push(row);
    projectedGroups.set(projectedNormalizedName, existing);
  });

  const dedupeRows: DedupeRow[] = [];

  projectedGroups.forEach((groupRows, projectedNormalizedName) => {
    if (groupRows.length < 2) {
      return;
    }

    const rankedRows = [...groupRows].sort(compareSnapshotRows);
    const canonicalRow = rankedRows[0];

    rankedRows.slice(1).forEach((row) => {
      dedupeRows.push({
        duplicateCultivarReferenceId: row.cultivarReferenceId,
        canonicalCultivarReferenceId: canonicalRow.cultivarReferenceId,
        canonicalAhsId: canonicalRow.ahsId,
        projectedNormalizedName,
      });
    });
  });

  return dedupeRows.sort((a, b) =>
    a.duplicateCultivarReferenceId.localeCompare(
      b.duplicateCultivarReferenceId,
      "en",
    ),
  );
}

function buildValuesClause(
  rows: string[],
  emptySelectColumns: string[],
): string {
  if (rows.length === 0) {
    return `SELECT
${emptySelectColumns.join(",\n")}
WHERE 0`;
  }

  return `VALUES
${rows.join(",\n")}`;
}

function buildTargetsCte(targetRows: TargetRow[]): string {
  return `"${TARGET_CTE_NAME}" ("cultivarReferenceId", "nextNormalizedName") AS (
${buildValuesClause(
  targetRows.map(
    (row) =>
      `  (${escapeSqlString(row.cultivarReferenceId)}, ${escapeSqlString(
        row.nextNormalizedName,
      )})`,
  ),
  [
    '  CAST(NULL AS TEXT) AS "cultivarReferenceId"',
    '  CAST(NULL AS TEXT) AS "nextNormalizedName"',
  ],
)}
)`;
}

function buildDedupeMapCte(dedupeRows: DedupeRow[]): string {
  return `"${DEDUPE_MAP_CTE_NAME}" (
  "duplicateCultivarReferenceId",
  "canonicalCultivarReferenceId",
  "canonicalAhsId",
  "projectedNormalizedName"
) AS (
${buildValuesClause(
  dedupeRows.map(
    (row) =>
      `  (${escapeSqlString(
        row.duplicateCultivarReferenceId,
      )}, ${escapeSqlString(
        row.canonicalCultivarReferenceId,
      )}, ${escapeSqlString(row.canonicalAhsId)}, ${escapeSqlString(
        row.projectedNormalizedName,
      )})`,
  ),
  [
    '  CAST(NULL AS TEXT) AS "duplicateCultivarReferenceId"',
    '  CAST(NULL AS TEXT) AS "canonicalCultivarReferenceId"',
    '  CAST(NULL AS TEXT) AS "canonicalAhsId"',
    '  CAST(NULL AS TEXT) AS "projectedNormalizedName"',
  ],
)}
)`;
}

function buildVerifyCtes(targetRows: TargetRow[], dedupeRows: DedupeRow[]): string {
  return `WITH
${buildTargetsCte(targetRows)},
${buildDedupeMapCte(dedupeRows)}`;
}

function buildIdList(ids: string[]): string {
  return ids.map((id) => escapeSqlString(id)).join(", ");
}

function buildCaseUpdateStatements(
  targetRows: TargetRow[],
  resolveValue: (row: TargetRow) => string,
): string {
  const statements: string[] = [];

  for (let index = 0; index < targetRows.length; index += UPDATE_BATCH_SIZE) {
    const batch = targetRows.slice(index, index + UPDATE_BATCH_SIZE);
    const cases = batch
      .map(
        (row) =>
          `  WHEN ${escapeSqlString(row.cultivarReferenceId)} THEN ${escapeSqlString(
            resolveValue(row),
          )}`,
      )
      .join("\n");

    statements.push(`UPDATE "CultivarReference"
SET "normalizedName" = CASE "id"
${cases}
  ELSE "normalizedName"
END
WHERE "id" IN (${buildIdList(batch.map((row) => row.cultivarReferenceId))});`);
  }

  return statements.join("\n\n");
}

function buildVerifySql(
  dbPath: string,
  targetRows: TargetRow[],
  dedupeRows: DedupeRow[],
): string {
  const deletedTargetRowCount = dedupeRows.filter((row) =>
    targetRows.some(
      (targetRow) =>
        targetRow.cultivarReferenceId === row.duplicateCultivarReferenceId,
    ),
  ).length;

  return `-- Generated by scripts/generate-cultivar-reference-normalization-cleanup-sql.ts
-- Source DB: ${dbPath}
-- Canonical normalization: normalizeCanonicalText(AhsListing.name)
-- Literal target normalizedName updates on the source snapshot: ${targetRows.length}
-- Literal duplicate CultivarReference rows to delete on the source snapshot: ${dedupeRows.length}
-- Literal target rows deleted by the dedupe step on the source snapshot: ${deletedTargetRowCount}
--
-- Before apply on the source snapshot, expect:
-- - current_cultivar_reference_count = 103995
-- - target_rows_present_in_current_state = ${targetRows.length}
-- - target_rows_missing_from_current_state = 0
-- - literal_rows_to_delete_still_present = ${dedupeRows.length}
-- - current_rows_out_of_sync_with_literal_targets = ${targetRows.length}
-- After apply, expect:
-- - current_cultivar_reference_count = 103992
-- - target_rows_present_in_current_state = ${targetRows.length - deletedTargetRowCount}
-- - target_rows_missing_from_current_state = ${deletedTargetRowCount}
-- - literal_rows_to_delete_still_present = 0
-- - current_rows_out_of_sync_with_literal_targets = 0

${buildVerifyCtes(targetRows, dedupeRows)}

SELECT
  "current_cultivar_reference_count" AS "check",
  COUNT(*) AS "value"
FROM "CultivarReference"
UNION ALL
SELECT
  "current_duplicate_normalized_name_groups" AS "check",
  COUNT(*) AS "value"
FROM (
  SELECT cr."normalizedName"
  FROM "CultivarReference" cr
  WHERE cr."normalizedName" IS NOT NULL
  GROUP BY cr."normalizedName"
  HAVING COUNT(*) > 1
)
UNION ALL
SELECT
  "current_dangling_listing_cultivar_reference_id" AS "check",
  COUNT(*) AS "value"
FROM "Listing" l
LEFT JOIN "CultivarReference" cr
  ON cr."id" = l."cultivarReferenceId"
WHERE l."cultivarReferenceId" IS NOT NULL
  AND cr."id" IS NULL
UNION ALL
SELECT
  "target_rows_present_in_current_state" AS "check",
  COUNT(*) AS "value"
FROM "CultivarReference" cr
INNER JOIN "${TARGET_CTE_NAME}" t
  ON t."cultivarReferenceId" = cr."id"
UNION ALL
SELECT
  "target_rows_missing_from_current_state" AS "check",
  COUNT(*) AS "value"
FROM "${TARGET_CTE_NAME}" t
LEFT JOIN "CultivarReference" cr
  ON cr."id" = t."cultivarReferenceId"
WHERE cr."id" IS NULL
UNION ALL
SELECT
  "literal_rows_to_delete" AS "check",
  COUNT(*) AS "value"
FROM "${DEDUPE_MAP_CTE_NAME}"
UNION ALL
SELECT
  "literal_rows_to_delete_still_present" AS "check",
  COUNT(*) AS "value"
FROM "CultivarReference" cr
INNER JOIN "${DEDUPE_MAP_CTE_NAME}" dm
  ON dm."duplicateCultivarReferenceId" = cr."id"
UNION ALL
SELECT
  "literal_rows_to_delete_with_linked_listings" AS "check",
  COUNT(*) AS "value"
FROM "Listing" l
INNER JOIN "${DEDUPE_MAP_CTE_NAME}" dm
  ON dm."duplicateCultivarReferenceId" = l."cultivarReferenceId"
UNION ALL
SELECT
  "current_rows_out_of_sync_with_literal_targets" AS "check",
  COUNT(*) AS "value"
FROM "CultivarReference" cr
INNER JOIN "${TARGET_CTE_NAME}" t
  ON t."cultivarReferenceId" = cr."id"
WHERE cr."normalizedName" <> t."nextNormalizedName";
`;
}

function buildApplySql(
  dbPath: string,
  targetRows: TargetRow[],
  dedupeRows: DedupeRow[],
): string {
  const updateListingStatements = dedupeRows
    .map(
      (row) => `UPDATE "Listing"
SET
  "cultivarReferenceId" = ${escapeSqlString(row.canonicalCultivarReferenceId)},
  "ahsId" = ${escapeSqlString(row.canonicalAhsId)}
WHERE "cultivarReferenceId" = ${escapeSqlString(
          row.duplicateCultivarReferenceId,
        )};`,
    )
    .join("\n\n");

  const deleteDuplicateRowsStatement =
    dedupeRows.length === 0
      ? ""
      : `DELETE FROM "CultivarReference"
WHERE "id" IN (${buildIdList(
          dedupeRows.map((row) => row.duplicateCultivarReferenceId),
        )});`;

  return `-- Generated by scripts/generate-cultivar-reference-normalization-cleanup-sql.ts
-- Source DB: ${dbPath}
-- Canonical normalization: normalizeCanonicalText(AhsListing.name)
-- Literal target normalizedName updates on the source snapshot: ${targetRows.length}
-- Literal duplicate CultivarReference rows to delete on the source snapshot: ${dedupeRows.length}
--
-- This migration:
-- 1. Repoints Listing rows off the literal duplicate CultivarReference ids.
-- 2. Deletes those duplicate CultivarReference rows.
-- 3. Rewrites surviving normalizedName values directly.
-- The temp-name pass is intentionally omitted because the current source
-- snapshot has no surviving rename chains or cycles after the dedupe step.

BEGIN TRANSACTION;

${updateListingStatements}

${deleteDuplicateRowsStatement}

${buildCaseUpdateStatements(targetRows, (row) => row.nextNormalizedName)}

COMMIT;
`;
}

async function main() {
  const dbPath = getDbPath();
  const rows = queryCultivarReferenceRows(dbPath);
  const targetRows = buildTargetRows(rows);
  const dedupeRows = buildDedupeRows(rows, targetRows);
  const verifySql = buildVerifySql(dbPath, targetRows, dedupeRows);
  const applySql = buildApplySql(dbPath, targetRows, dedupeRows);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(VERIFY_FILE, verifySql, "utf8");
  await writeFile(APPLY_FILE, applySql, "utf8");

  console.log(`Wrote ${VERIFY_FILE}`);
  console.log(`Wrote ${APPLY_FILE}`);
  console.log(`Changed normalizedName targets: ${targetRows.length}`);
  console.log(`Dedupe rows to delete: ${dedupeRows.length}`);
}

await main();
