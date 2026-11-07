import { DatabaseSync } from "node:sqlite";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";

/** @param {string} name */
const quoted = (name) => `"${name.replaceAll('"', '""')}"`;
/** @param {import("@libsql/client").Value | undefined} value */
const localValue = (value) =>
  value instanceof ArrayBuffer ? new Uint8Array(value) : (value ?? null);

// The caller owns a read-only transaction. No query in this function writes to it.
/** @param {import("@libsql/client").Client} source
 * @param {string} outputPath */
export async function copyPreviewSeed(source, outputPath) {
  const directory = path.dirname(outputPath);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (existsSync(outputPath))
    throw new Error("Preview seed already exists; refusing to overwrite it.");
  const stagingDirectory = mkdtempSync(path.join(directory, ".preview-seed-"));
  const stagingPath = path.join(stagingDirectory, "snapshot.sqlite");
  let local;
  let tx;
  try {
    tx = await source.transaction("read");
    const schema = await tx.execute(
      "SELECT type, name, sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT GLOB 'sqlite_*' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'view' THEN 2 WHEN 'trigger' THEN 3 ELSE 4 END, name",
    );
    const objects = schema.rows.map((row) => {
      if (
        typeof row.type !== "string" ||
        typeof row.name !== "string" ||
        typeof row.sql !== "string"
      )
        throw new Error("Invalid preview schema metadata.");
      return { type: row.type, name: row.name, sql: row.sql };
    });
    for (const row of objects) {
      if (
        !["table", "index", "view", "trigger"].includes(row.type) ||
        /^\s*CREATE\s+VIRTUAL\s+TABLE/i.test(row.sql)
      ) {
        throw new Error("Preview schema contains an unsupported object.");
      }
    }
    local = new DatabaseSync(stagingPath);
    chmodSync(stagingPath, 0o600);
    local.exec("PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;");
    const tables = objects.filter((row) => row.type === "table");
    for (const row of tables) local.exec(row.sql);
    for (const table of tables) {
      const columns = await tx.execute(
        `PRAGMA table_xinfo(${quoted(table.name)})`,
      );
      const metadata = columns.rows.map((column) => {
        if (typeof column.name !== "string")
          throw new Error("Invalid preview column metadata.");
        return { name: column.name, hidden: column.hidden, pk: column.pk };
      });
      const writable = metadata
        .filter((column) => Number(column.hidden) === 0)
        .map((column) => column.name);
      if (!writable.length)
        throw new Error(`No writable columns in ${table.name}.`);
      const names = writable.map(quoted).join(", ");
      const primaryKey = metadata
        .filter((column) => Number(column.pk) > 0)
        .sort((a, b) => Number(a.pk) - Number(b.pk))
        .map((column) => quoted(column.name));
      const withoutRowid = /\bWITHOUT\s+ROWID\b/i.test(table.sql.trim());
      const aliases = ["rowid", "_rowid_", "oid"];
      const namesLower = new Set(
        metadata.map((column) => column.name.toLowerCase()),
      );
      const rowid = aliases.find((name) => !namesLower.has(name));
      if (!withoutRowid && !rowid)
        throw new Error(`Cannot order ${table.name} safely.`);
      const order = [
        ...primaryKey,
        ...(rowid && !withoutRowid ? [quoted(rowid)] : []),
      ];
      if (!order.length) throw new Error(`Cannot order ${table.name} safely.`);
      const insert = local.prepare(
        `INSERT INTO ${quoted(table.name)} (${names}) VALUES (${writable.map(() => "?").join(", ")})`,
      );
      let offset = 0;
      while (true) {
        const batch = await tx.execute({
          sql: `SELECT ${names} FROM ${quoted(table.name)} ORDER BY ${order.join(", ")} LIMIT ? OFFSET ?`,
          args: [500, offset],
        });
        for (const row of batch.rows)
          insert.run(...writable.map((name) => localValue(row[name])));
        offset += batch.rows.length;
        if (batch.rows.length < 500) break;
      }
      const count = await tx.execute(
        `SELECT COUNT(*) AS total FROM ${quoted(table.name)}`,
      );
      const total = count.rows[0]?.total;
      if (
        (typeof total !== "number" &&
          typeof total !== "bigint" &&
          typeof total !== "string") ||
        BigInt(total) !== BigInt(offset)
      )
        throw new Error(`Count mismatch in ${table.name}.`);
    }
    // Preserve AUTOINCREMENT counters rather than deriving them from surviving rows.
    const sequenceExists = await tx.execute(
      "SELECT name FROM sqlite_schema WHERE name='sqlite_sequence' AND type='table'",
    );
    if (sequenceExists.rows.length) {
      const sequence = await tx.execute(
        "SELECT name, seq FROM sqlite_sequence",
      );
      local.exec("DELETE FROM sqlite_sequence");
      const insert = local.prepare(
        "INSERT INTO sqlite_sequence(name, seq) VALUES (?, ?)",
      );
      for (const row of sequence.rows)
        insert.run(localValue(row.name), localValue(row.seq));
    }
    for (const row of objects.filter((item) => item.type !== "table"))
      local.exec(row.sql);
    local.exec("COMMIT; PRAGMA foreign_keys=ON;");
    if (local.prepare("PRAGMA quick_check").get()?.quick_check !== "ok")
      throw new Error("Preview snapshot integrity check failed.");
    if (local.prepare("PRAGMA foreign_key_check").all().length)
      throw new Error("Preview snapshot has foreign-key violations.");
    local.close();
    local = undefined;
    tx.close();
    tx = undefined;
    // Refuse to replace even if another process created a destination during copying.
    const { linkSync, unlinkSync } = await import("node:fs");
    linkSync(stagingPath, outputPath);
    unlinkSync(stagingPath);
  } finally {
    if (tx) tx.close();
    if (local) local.close();
    rmSync(stagingDirectory, { recursive: true, force: true });
  }
}
