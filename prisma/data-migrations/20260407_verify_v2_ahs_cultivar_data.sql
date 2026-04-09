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
