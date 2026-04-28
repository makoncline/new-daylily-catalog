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
