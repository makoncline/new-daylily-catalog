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
    fileName: "20260209_populate_cultivar_reference_from_ahs.sql",
    contents: `
BEGIN TRANSACTION;

INSERT INTO "CultivarReference" (
  "id",
  "ahsId",
  "normalizedName",
  "createdAt",
  "updatedAt"
)
SELECT
  'cr-ahs-' || a."id" AS "id",
  a."id" AS "ahsId",
  CASE
    WHEN a."name" IS NULL OR TRIM(a."name") = '' THEN NULL
    ELSE LOWER(TRIM(a."name"))
  END AS "normalizedName",
  CURRENT_TIMESTAMP AS "createdAt",
  CURRENT_TIMESTAMP AS "updatedAt"
FROM "AhsListing" a
WHERE a."id" IS NOT NULL
ON CONFLICT("ahsId") DO UPDATE SET
  "normalizedName" = excluded."normalizedName",
  "updatedAt" = CURRENT_TIMESTAMP;

COMMIT;

-- Validation helpers:
-- SELECT COUNT(*) FROM "CultivarReference";
-- SELECT COUNT(*) FROM "AhsListing";
-- SELECT COUNT(*) FROM "CultivarReference" WHERE "ahsId" IS NULL;
`,
  },
  {
    fileName: "20260209_backfill_listing_cultivar_reference_id.sql",
    contents: `
BEGIN TRANSACTION;

UPDATE "Listing"
SET "cultivarReferenceId" = (
  SELECT cr."id"
  FROM "CultivarReference" cr
  WHERE cr."ahsId" = "Listing"."ahsId"
  LIMIT 1
)
WHERE "ahsId" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "CultivarReference" cr
    WHERE cr."ahsId" = "Listing"."ahsId"
  )
  AND (
    "cultivarReferenceId" IS NULL
    OR "cultivarReferenceId" != (
      SELECT cr."id"
      FROM "CultivarReference" cr
      WHERE cr."ahsId" = "Listing"."ahsId"
      LIMIT 1
    )
  );

COMMIT;

-- Validation helpers:
-- SELECT COUNT(*) FROM "Listing" WHERE "ahsId" IS NOT NULL;
-- SELECT COUNT(*) FROM "Listing" WHERE "ahsId" IS NOT NULL AND "cultivarReferenceId" IS NOT NULL;
-- SELECT COUNT(*) FROM "Listing" l
-- LEFT JOIN "CultivarReference" cr ON cr."id" = l."cultivarReferenceId"
-- WHERE l."cultivarReferenceId" IS NOT NULL AND cr."id" IS NULL;
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
    console.log(`[data-sql] unchanged ${artifact.fileName}`);
    return;
  }

  fs.writeFileSync(filePath, next, "utf8");
  const status = exists ? "updated" : "created";
  console.log(`[data-sql] ${status} ${artifact.fileName}`);
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const artifact of ARTIFACTS) {
    writeArtifact(artifact);
  }
}

main();
