-- Store member versions in the adapter's unixepoch-ms format.
-- Keep the same instant. Stop before any update if a text date is invalid.
BEGIN IMMEDIATE;
CREATE TEMP TABLE member_version_storage_check (valid INTEGER NOT NULL CHECK (valid = 1));
INSERT INTO member_version_storage_check SELECT CASE WHEN EXISTS (SELECT 1 FROM "UserProfile" WHERE typeof("updatedAt") = 'text' AND strftime('%s', "updatedAt") IS NULL) THEN 0 ELSE 1 END;
INSERT INTO member_version_storage_check SELECT CASE WHEN EXISTS (SELECT 1 FROM "Listing" WHERE typeof("updatedAt") = 'text' AND strftime('%s', "updatedAt") IS NULL) THEN 0 ELSE 1 END;
INSERT INTO member_version_storage_check SELECT CASE WHEN EXISTS (SELECT 1 FROM "List" WHERE typeof("updatedAt") = 'text' AND strftime('%s', "updatedAt") IS NULL) THEN 0 ELSE 1 END;
UPDATE "UserProfile" SET "updatedAt" = CAST(strftime('%s', "updatedAt") AS INTEGER) * 1000 + CAST(substr(strftime('%f', "updatedAt"), 4, 3) AS INTEGER) WHERE typeof("updatedAt") = 'text';
UPDATE "Listing" SET "updatedAt" = CAST(strftime('%s', "updatedAt") AS INTEGER) * 1000 + CAST(substr(strftime('%f', "updatedAt"), 4, 3) AS INTEGER) WHERE typeof("updatedAt") = 'text';
UPDATE "List" SET "updatedAt" = CAST(strftime('%s', "updatedAt") AS INTEGER) * 1000 + CAST(substr(strftime('%f', "updatedAt"), 4, 3) AS INTEGER) WHERE typeof("updatedAt") = 'text';
DROP TABLE member_version_storage_check;
COMMIT;
