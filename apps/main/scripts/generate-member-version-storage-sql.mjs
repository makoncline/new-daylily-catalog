import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const tables = ["UserProfile", "Listing", "List"];
const milliseconds = (column) =>
  `CAST(strftime('%s', ${column}) AS INTEGER) * 1000 + CAST(substr(strftime('%f', ${column}), 4, 3) AS INTEGER)`;

const sql = [
  "-- Store member versions in the adapter's unixepoch-ms format.",
  "-- Keep the same instant. Stop before any update if a text date is invalid.",
  "BEGIN IMMEDIATE;",
  "CREATE TEMP TABLE member_version_storage_check (valid INTEGER NOT NULL CHECK (valid = 1));",
  ...tables.map(
    (table) =>
      `INSERT INTO member_version_storage_check SELECT CASE WHEN EXISTS (SELECT 1 FROM "${table}" WHERE typeof("updatedAt") = 'text' AND (strftime('%s', "updatedAt") IS NULL OR date(substr("updatedAt", 1, 10), '+0 days') IS NOT substr("updatedAt", 1, 10))) THEN 0 ELSE 1 END;`,
  ),
  ...tables.map(
    (table) =>
      `UPDATE "${table}" SET "updatedAt" = ${milliseconds('"updatedAt"')} WHERE typeof("updatedAt") = 'text';`,
  ),
  "DROP TABLE member_version_storage_check;",
  "COMMIT;",
  "",
].join("\n");

const output = path.resolve(
  import.meta.dirname,
  "../prisma/data-migrations/20261006_normalize_member_version_storage.sql",
);
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, sql);
console.log(output);
