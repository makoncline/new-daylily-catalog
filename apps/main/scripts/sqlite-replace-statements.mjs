#!/usr/bin/env node

import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";

/** @param {string} identifier */
function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

/** @param {string} databasePath @returns {string[]} */
export function getDependencyOrderedTables(databasePath) {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all()
      .map(({ name }) => String(name));
    const tableSet = new Set(tables);
    const parentsByTable = new Map();
    const referencedByCount = new Map(tables.map((table) => [table, 0]));

    for (const table of tables) {
      const parents = new Set(
        db
          .prepare(`PRAGMA foreign_key_list(${quoteIdentifier(table)})`)
          .all()
          .map(({ table: parent }) => String(parent))
          .filter((parent) => tableSet.has(parent)),
      );
      parentsByTable.set(table, parents);
      for (const parent of parents) {
        referencedByCount.set(parent, (referencedByCount.get(parent) ?? 0) + 1);
      }
    }

    const ready = tables
      .filter((table) => referencedByCount.get(table) === 0)
      .sort();
    const orderedTables = [];
    while (ready.length > 0) {
      const table = ready.shift();
      if (!table) break;
      orderedTables.push(table);
      for (const parent of parentsByTable.get(table) ?? []) {
        const remainingReferences = (referencedByCount.get(parent) ?? 0) - 1;
        referencedByCount.set(parent, remainingReferences);
        if (remainingReferences === 0) {
          ready.push(parent);
          ready.sort();
        }
      }
    }

    if (orderedTables.length !== tables.length) {
      throw new Error(
        "Cannot safely replace a SQLite database with cyclic foreign-key dependencies.",
      );
    }

    return orderedTables;
  } finally {
    db.close();
  }
}

/** @param {string} databasePath @returns {string[]} */
export function getDependencyOrderedDropStatements(databasePath) {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const views = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'view' ORDER BY name",
      )
      .all()
      .map(({ name }) => String(name));
    return [
      ...views.map((view) => `DROP VIEW IF EXISTS ${quoteIdentifier(view)};`),
      ...getDependencyOrderedTables(databasePath).map(
        (table) => `DROP TABLE IF EXISTS ${quoteIdentifier(table)};`,
      ),
    ];
  } finally {
    db.close();
  }
}

/** @param {string} databasePath @returns {string[]} */
export function getSchemaStatements(databasePath) {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return db
      .prepare(
        `
        SELECT sql
        FROM sqlite_master
        WHERE sql IS NOT NULL
          AND name NOT LIKE 'sqlite_%'
        ORDER BY CASE type
          WHEN 'table' THEN 0
          WHEN 'index' THEN 1
          WHEN 'trigger' THEN 2
          WHEN 'view' THEN 3
          ELSE 4
        END, name
      `,
      )
      .all()
      .map(({ sql }) => `${String(sql)};`);
  } finally {
    db.close();
  }
}

/** @param {string} databasePath @returns {string} */
export function getCountVerificationStatement(databasePath) {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const conditions = getDependencyOrderedTables(databasePath)
      .map((table) => {
        const count = db
          .prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)}`)
          .get()?.count;
        return `(SELECT COUNT(*) FROM ${quoteIdentifier(table)}) = ${String(count)}`;
      })
      .join(" AND\n  ");
    return `SELECT CASE WHEN\n  ${conditions}\nTHEN 'seed-sync-counts-ok'\nELSE 'seed-sync-counts-mismatch'\nEND AS verification;`;
  } finally {
    db.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const loadOrderOnly = process.argv[2] === "--load-order";
  const schemaOnly = process.argv[2] === "--schema";
  const verifyCountsOnly = process.argv[2] === "--verify-counts";
  const databasePath =
    process.argv[loadOrderOnly || schemaOnly || verifyCountsOnly ? 3 : 2];
  if (!databasePath) {
    console.error(
      "Usage: sqlite-replace-statements.mjs [--load-order|--schema|--verify-counts] <database-path>",
    );
    process.exitCode = 1;
  } else if (loadOrderOnly) {
    console.log(
      [...getDependencyOrderedTables(databasePath)].reverse().join("\n"),
    );
  } else if (schemaOnly) {
    console.log(getSchemaStatements(databasePath).join("\n"));
  } else if (verifyCountsOnly) {
    console.log(getCountVerificationStatement(databasePath));
  } else {
    console.log(getDependencyOrderedDropStatements(databasePath).join("\n"));
  }
}
