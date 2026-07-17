import { DatabaseSync } from "node:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

import {
  getCountVerificationStatement,
  getDependencyOrderedDropStatements,
  getDependencyOrderedTables,
  getSchemaStatements,
} from "../scripts/sqlite-replace-statements.mjs";

test("drops foreign-key dependents before the tables they reference", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "sqlite-drop-order-"));
  const databasePath = path.join(directory, "database.sqlite");
  const db = new DatabaseSync(databasePath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE Parent (id TEXT PRIMARY KEY);
    CREATE TABLE Child (
      id TEXT PRIMARY KEY,
      parentId TEXT NOT NULL REFERENCES Parent(id)
    );
    CREATE TABLE Grandchild (
      id TEXT PRIMARY KEY,
      childId TEXT NOT NULL REFERENCES Child(id)
    );
    CREATE INDEX Child_parentId_idx ON Child(parentId);
    INSERT INTO Parent VALUES ('parent');
    INSERT INTO Child VALUES ('child', 'parent');
    INSERT INTO Grandchild VALUES ('grandchild', 'child');
    ANALYZE;
  `);
  db.close();

  const schemaStatements = getSchemaStatements(databasePath);
  const countVerificationStatement =
    getCountVerificationStatement(databasePath);
  expect(schemaStatements.join("\n")).not.toContain("sqlite_stat1");
  expect(
    schemaStatements.findIndex((sql) => sql.includes("CREATE TABLE")),
  ).toBe(0);
  const lastTableIndex = schemaStatements.reduce(
    (lastIndex, sql, index) =>
      sql.includes("CREATE TABLE") ? index : lastIndex,
    -1,
  );
  expect(
    schemaStatements.findIndex((sql) => sql.includes("CREATE INDEX")),
  ).toBeGreaterThan(lastTableIndex);
  const sourceCheck = new DatabaseSync(databasePath, { readOnly: true });
  expect(sourceCheck.prepare(countVerificationStatement).get()).toEqual({
    verification: "seed-sync-counts-ok",
  });
  sourceCheck.close();

  const statements = getDependencyOrderedDropStatements(databasePath);
  expect(statements).toEqual([
    'DROP TABLE IF EXISTS "Grandchild";',
    'DROP TABLE IF EXISTS "Child";',
    'DROP TABLE IF EXISTS "Parent";',
  ]);
  expect([...getDependencyOrderedTables(databasePath)].reverse()).toEqual([
    "Parent",
    "Child",
    "Grandchild",
  ]);

  const restored = new DatabaseSync(databasePath);
  restored.exec("PRAGMA foreign_keys = ON;");
  for (const statement of statements) restored.exec(statement);
  expect(
    restored
      .prepare(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      )
      .get()?.count,
  ).toBe(0);
  restored.close();

  const schemaCopy = new DatabaseSync(path.join(directory, "schema.sqlite"));
  for (const statement of schemaStatements) schemaCopy.exec(statement);
  expect(schemaCopy.prepare(countVerificationStatement).get()).toEqual({
    verification: "seed-sync-counts-mismatch",
  });
  expect(
    schemaCopy
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all(),
  ).toEqual([{ name: "Child" }, { name: "Grandchild" }, { name: "Parent" }]);
  schemaCopy.close();
});
