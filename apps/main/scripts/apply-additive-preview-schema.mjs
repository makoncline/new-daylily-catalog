import { DatabaseSync } from "node:sqlite";

const identifier = '"(?:[^"\\n]|"")+"';
const column = `${identifier}(?:\\s+(?:ASC|DESC))?`;
const addColumn = new RegExp(
  `^ALTER\\s+TABLE\\s+${identifier}\\s+ADD\\s+COLUMN\\s+${identifier}\\s+(?:TEXT|INTEGER|REAL|BLOB|NUMERIC|BOOLEAN|DATETIME)$`,
  "i",
);
const addIndex = new RegExp(
  `^CREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+${identifier}\\s+ON\\s+${identifier}\\s*\\(\\s*${column}(?:\\s*,\\s*${column})*\\s*\\)$`,
  "i",
);

/** Apply only simple additive schema changes, to an isolated snapshot. */
export function applyAdditivePreviewSchema(databasePath, sql) {
  const statements = sql
    .replace(/^\s*--[^\n]*$/gm, "")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  if (
    !statements.length ||
    statements.some(
      (statement) => !addColumn.test(statement) && !addIndex.test(statement),
    )
  ) {
    throw new Error(
      "Preview schema needs a non-additive or unsupported change. No seed was installed.",
    );
  }
  const db = new DatabaseSync(databasePath);
  try {
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const statement of statements) db.exec(statement);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.close();
  }
}
