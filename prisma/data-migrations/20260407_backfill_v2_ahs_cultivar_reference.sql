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
