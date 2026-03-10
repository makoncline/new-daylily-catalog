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
