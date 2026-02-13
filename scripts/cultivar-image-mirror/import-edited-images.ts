import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

interface DbRow {
  id: string;
  local_relative_path: string | null;
  edit_status: string;
  edited_relative_path: string | null;
}

interface TableColumnRow {
  name: string;
}

const DEFAULT_DB_PATH =
  "/Users/makon/dev/apps/new-daylily-catalog/scripts/cultivar-image-mirror/output/cultivar-images.sqlite";
const DEFAULT_OUTPUT_ROOT =
  "/Users/makon/dev/apps/new-daylily-catalog/scripts/cultivar-image-mirror/output";
const DEFAULT_EDITED_DIR = path.join(DEFAULT_OUTPUT_ROOT, "edited-images");
const DEFAULT_EDITED_DIR_NAME = "edited-images";

function parseArgs() {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    if (idx === -1) return undefined;
    return args[idx + 1];
  };

  const dbPath = path.resolve(getArg("--db") ?? DEFAULT_DB_PATH);
  const editedDir = path.resolve(getArg("--edited-dir") ?? DEFAULT_EDITED_DIR);
  const editedDirName = getArg("--edited-dir-name") ?? DEFAULT_EDITED_DIR_NAME;
  const overwrite = args.includes("--overwrite");

  return { dbPath, editedDir, editedDirName, overwrite };
}

function sqliteReadJson<T>(dbPath: string, sql: string): T[] {
  const output = execFileSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
  });
  const trimmed = output.trim();
  if (!trimmed) return [];
  return JSON.parse(trimmed) as T[];
}

function runSql(dbPath: string, sql: string) {
  execFileSync("sqlite3", [dbPath], {
    input: `${sql}\n`,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
  });
}

function sqlEscape(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function ensureEditColumns(dbPath: string) {
  runSql(
    dbPath,
    `
CREATE TABLE IF NOT EXISTS cultivar_images (
  id TEXT PRIMARY KEY,
  img_url TEXT NOT NULL
);
`,
  );

  const columns = sqliteReadJson<TableColumnRow>(
    dbPath,
    "SELECT name FROM pragma_table_info('cultivar_images');",
  );
  const names = new Set(columns.map((column) => column.name));

  const alters: string[] = [];
  if (!names.has("local_relative_path")) {
    alters.push("ALTER TABLE cultivar_images ADD COLUMN local_relative_path TEXT;");
  }
  if (!names.has("edit_status")) {
    alters.push(
      "ALTER TABLE cultivar_images ADD COLUMN edit_status TEXT NOT NULL DEFAULT 'pending';",
    );
  }
  if (!names.has("edited_relative_path")) {
    alters.push(
      "ALTER TABLE cultivar_images ADD COLUMN edited_relative_path TEXT;",
    );
  }

  if (alters.length > 0) {
    runSql(dbPath, alters.join("\n"));
  }
}

function listEditedFiles(editedDir: string) {
  const allowed = new Set([".png", ".jpg", ".jpeg", ".webp"]);
  return fs
    .readdirSync(editedDir)
    .filter((name) => allowed.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

function getStem(fileName: string) {
  return path.basename(fileName, path.extname(fileName));
}

function queryByStem(dbPath: string, stem: string): DbRow[] {
  const sql = `
SELECT
  id,
  local_relative_path,
  edit_status,
  edited_relative_path
FROM cultivar_images
WHERE local_relative_path LIKE '%/' || ${sqlEscape(stem)} || '.%'
ORDER BY id;
`;
  return sqliteReadJson<DbRow>(dbPath, sql);
}

function markEdited(
  dbPath: string,
  id: string,
  editedRelativePath: string,
  overwrite: boolean,
) {
  const overwriteGuard = overwrite
    ? ""
    : "AND (edit_status IS NULL OR edit_status <> 'edited')";

  runSql(
    dbPath,
    `
UPDATE cultivar_images
SET
  edit_status = 'edited',
  edited_relative_path = ${sqlEscape(editedRelativePath)}
WHERE id = ${sqlEscape(id)}
${overwriteGuard};
`,
  );
}

async function run() {
  const options = parseArgs();
  ensureEditColumns(options.dbPath);

  if (!fs.existsSync(options.editedDir)) {
    throw new Error(`Edited dir does not exist: ${options.editedDir}`);
  }

  const files = listEditedFiles(options.editedDir);
  console.log(`[import-edits] files=${files.length} dir=${options.editedDir}`);

  let updated = 0;
  let skipped = 0;
  let unmatched = 0;
  let ambiguous = 0;

  for (const fileName of files) {
    const stem = getStem(fileName);
    const matches = queryByStem(options.dbPath, stem);
    const editedRelativePath = path
      .join(options.editedDirName, fileName)
      .replaceAll(path.sep, "/");

    if (matches.length === 0) {
      unmatched += 1;
      continue;
    }

    if (matches.length > 1) {
      // This should be rare given stem includes post_id; don't guess.
      ambiguous += 1;
      continue;
    }

    const row = matches[0]!;
    if (!options.overwrite && row.edit_status === "edited") {
      skipped += 1;
      continue;
    }

    markEdited(options.dbPath, row.id, editedRelativePath, options.overwrite);
    updated += 1;
  }

  console.log(
    `[import-edits] updated=${updated} skipped=${skipped} unmatched=${unmatched} ambiguous=${ambiguous}`,
  );

  if (ambiguous > 0) {
    console.log(
      "[import-edits] Some stems matched multiple rows. Those were skipped; consider renaming edited files to include post_id.",
    );
  }
}

run().catch((error) => {
  console.error("[import-edits] Fatal:", error);
  process.exitCode = 1;
});
