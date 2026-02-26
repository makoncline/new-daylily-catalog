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
