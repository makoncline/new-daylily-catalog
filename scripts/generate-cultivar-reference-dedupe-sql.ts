import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface SqlArtifact {
  fileName: string;
  contents: string;
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const OUTPUT_DIR = path.join(REPO_ROOT, "prisma", "data-migrations");

const ARTIFACTS: SqlArtifact[] = [
  {
    fileName: "20260225_dedupe_cultivar_reference_normalized_name.sql",
    contents: `
BEGIN TRANSACTION;

CREATE TEMP TABLE IF NOT EXISTS "__cultivar_ref_dedupe_map" (
  "duplicateCultivarReferenceId" TEXT PRIMARY KEY,
  "canonicalCultivarReferenceId" TEXT NOT NULL,
  "canonicalAhsId" TEXT
);

DELETE FROM "__cultivar_ref_dedupe_map";

INSERT INTO "__cultivar_ref_dedupe_map" (
  "duplicateCultivarReferenceId",
  "canonicalCultivarReferenceId",
  "canonicalAhsId"
)
WITH duplicate_names AS (
  SELECT
    cr."normalizedName" AS normalized_name
  FROM "CultivarReference" cr
  WHERE cr."normalizedName" IS NOT NULL
  GROUP BY cr."normalizedName"
  HAVING COUNT(*) > 1
),
ranked AS (
  SELECT
    cr."id" AS cultivar_reference_id,
    cr."normalizedName" AS normalized_name,
    cr."ahsId" AS ahs_id,
    CASE
      WHEN LOWER(COALESCE(a."year", "")) LIKE "%reserved%" THEN 1
      ELSE 0
    END AS year_is_reserved,
    CASE
      WHEN a."ahsImageUrl" IS NULL OR TRIM(a."ahsImageUrl") = "" THEN 0
      ELSE 1
    END AS has_image,
    CASE
      WHEN a."year" GLOB "[1-2][0-9][0-9][0-9]" THEN 1
      ELSE 0
    END AS year_is_four_digit,
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
    ) AS completeness_score,
    (
      SELECT COUNT(*)
      FROM "Listing" l
      WHERE l."cultivarReferenceId" = cr."id"
    ) AS linked_listing_count,
    ROW_NUMBER() OVER (
      PARTITION BY cr."normalizedName"
      ORDER BY
        CASE
          WHEN LOWER(COALESCE(a."year", "")) LIKE "%reserved%" THEN 1
          ELSE 0
        END ASC,
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
        ) DESC,
        CASE
          WHEN a."ahsImageUrl" IS NULL OR TRIM(a."ahsImageUrl") = "" THEN 0
          ELSE 1
        END DESC,
        CASE
          WHEN a."year" GLOB "[1-2][0-9][0-9][0-9]" THEN 1
          ELSE 0
        END DESC,
        (
          SELECT COUNT(*)
          FROM "Listing" l
          WHERE l."cultivarReferenceId" = cr."id"
        ) DESC,
        CAST(COALESCE(cr."ahsId", "0") AS INTEGER) DESC,
        cr."id" DESC
    ) AS candidate_rank
  FROM "CultivarReference" cr
  INNER JOIN duplicate_names d
    ON d.normalized_name = cr."normalizedName"
  LEFT JOIN "AhsListing" a
    ON a."id" = cr."ahsId"
),
canonical AS (
  SELECT
    r.normalized_name,
    r.cultivar_reference_id AS canonical_cultivar_reference_id,
    r.ahs_id AS canonical_ahs_id
  FROM ranked r
  WHERE r.candidate_rank = 1
)
SELECT
  r.cultivar_reference_id AS duplicateCultivarReferenceId,
  c.canonical_cultivar_reference_id AS canonicalCultivarReferenceId,
  c.canonical_ahs_id AS canonicalAhsId
FROM ranked r
INNER JOIN canonical c
  ON c.normalized_name = r.normalized_name
WHERE r.cultivar_reference_id <> c.canonical_cultivar_reference_id;

UPDATE "Listing"
SET
  "cultivarReferenceId" = (
    SELECT m."canonicalCultivarReferenceId"
    FROM "__cultivar_ref_dedupe_map" m
    WHERE m."duplicateCultivarReferenceId" = "Listing"."cultivarReferenceId"
    LIMIT 1
  ),
  "ahsId" = COALESCE(
    (
      SELECT m."canonicalAhsId"
      FROM "__cultivar_ref_dedupe_map" m
      WHERE m."duplicateCultivarReferenceId" = "Listing"."cultivarReferenceId"
      LIMIT 1
    ),
    "ahsId"
  )
WHERE EXISTS (
  SELECT 1
  FROM "__cultivar_ref_dedupe_map" m
  WHERE m."duplicateCultivarReferenceId" = "Listing"."cultivarReferenceId"
);

DELETE FROM "CultivarReference"
WHERE "id" IN (
  SELECT m."duplicateCultivarReferenceId"
  FROM "__cultivar_ref_dedupe_map" m
);

DROP TABLE "__cultivar_ref_dedupe_map";

COMMIT;

-- Validation helpers:
-- SELECT COUNT(*) FROM "CultivarReference" WHERE "normalizedName" IS NULL;
-- SELECT COUNT(*) FROM (
--   SELECT "normalizedName"
--   FROM "CultivarReference"
--   WHERE "normalizedName" IS NOT NULL
--   GROUP BY "normalizedName"
--   HAVING COUNT(*) > 1
-- );
-- SELECT COUNT(*) FROM (
--   SELECT 1
--   FROM "Listing" l
--   LEFT JOIN "CultivarReference" cr ON cr."id" = l."cultivarReferenceId"
--   WHERE l."cultivarReferenceId" IS NOT NULL AND cr."id" IS NULL
-- );
`,
  },
  {
    fileName: "20260225_verify_dedupe_cultivar_reference_normalized_name.sql",
    contents: `
SELECT
  "duplicate_normalized_name_groups" AS "check",
  COUNT(*) AS "value"
FROM (
  SELECT cr."normalizedName"
  FROM "CultivarReference" cr
  WHERE cr."normalizedName" IS NOT NULL
  GROUP BY cr."normalizedName"
  HAVING COUNT(*) > 1
);

SELECT
  "dangling_listing_cultivar_reference_id" AS "check",
  COUNT(*) AS "value"
FROM "Listing" l
LEFT JOIN "CultivarReference" cr
  ON cr."id" = l."cultivarReferenceId"
WHERE l."cultivarReferenceId" IS NOT NULL
  AND cr."id" IS NULL;

SELECT
  "cultivar_reference_ahs_missing" AS "check",
  COUNT(*) AS "value"
FROM "CultivarReference" cr
LEFT JOIN "AhsListing" a
  ON a."id" = cr."ahsId"
WHERE cr."ahsId" IS NOT NULL
  AND a."id" IS NULL;

SELECT
  "linked_listings_on_reserved_year_ahs" AS "check",
  COUNT(*) AS "value"
FROM "Listing" l
INNER JOIN "CultivarReference" cr
  ON cr."id" = l."cultivarReferenceId"
INNER JOIN "AhsListing" a
  ON a."id" = cr."ahsId"
WHERE LOWER(COALESCE(a."year", "")) LIKE "%reserved%";

SELECT
  "normalized_name_unique_index_exists" AS "check",
  COUNT(*) AS "value"
FROM "sqlite_master"
WHERE "type" = "index"
  AND "name" = "CultivarReference_normalizedName_unique_idx";

-- Optional debugging details if anything is non-zero:
SELECT
  cr."normalizedName",
  COUNT(*) AS "duplicateCount"
FROM "CultivarReference" cr
WHERE cr."normalizedName" IS NOT NULL
GROUP BY cr."normalizedName"
HAVING COUNT(*) > 1
ORDER BY "duplicateCount" DESC, cr."normalizedName"
LIMIT 20;
`,
  },
];

function normalizeSql(contents: string) {
  return `${contents.trim()}\n`;
}

function writeArtifact(artifact: SqlArtifact) {
  const filePath = path.join(OUTPUT_DIR, artifact.fileName);
  const next = normalizeSql(artifact.contents);
  const exists = fs.existsSync(filePath);
  const previous = exists ? fs.readFileSync(filePath, "utf8") : null;

  if (previous === next) {
    console.log(`[dedupe-sql] unchanged ${artifact.fileName}`);
    return;
  }

  fs.writeFileSync(filePath, next, "utf8");
  const status = exists ? "updated" : "created";
  console.log(`[dedupe-sql] ${status} ${artifact.fileName}`);
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const artifact of ARTIFACTS) {
    writeArtifact(artifact);
  }
}

main();
