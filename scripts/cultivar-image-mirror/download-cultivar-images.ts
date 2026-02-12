import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { slugify } from "@/lib/utils/slugify";

interface CultivarImageRow {
  id: string;
  post_id: string | null;
  post_title: string | null;
  img_url: string;
}

interface DownloadedRow extends CultivarImageRow {
  local_relative_path: string;
  reused_existing_file: boolean;
}

interface TableColumnRow {
  name: string;
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOURCE_DB = path.resolve(SCRIPT_DIR, "../scrape/cultivars.db");
const DEFAULT_OUTPUT_DIR = path.resolve(SCRIPT_DIR, "output");
const DEFAULT_IMAGES_DIR_NAME = "images";
const DEFAULT_OUTPUT_DB_NAME = "cultivar-images.sqlite";
const DEFAULT_MAX_IN_FLIGHT = 10;
const DEFAULT_RETRY_COUNT = 3;
const REQUEST_TIMEOUT_MS = 30_000;

function parseArgs() {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const index = args.indexOf(flag);
    if (index === -1) return undefined;
    return args[index + 1];
  };

  const sourceDb = getArg("--source-db") ?? DEFAULT_SOURCE_DB;
  const outputDir = getArg("--output-dir") ?? DEFAULT_OUTPUT_DIR;
  const outputDb = getArg("--output-db");
  const limitArg = getArg("--limit");
  const maxInFlightArg = getArg("--max-in-flight");
  const retryArg = getArg("--retries");
  const includePlaceholders = args.includes("--include-placeholders");
  const seedOnly = args.includes("--seed-only");

  const limit = limitArg ? Number(limitArg) : undefined;
  const maxInFlight = maxInFlightArg
    ? Number(maxInFlightArg)
    : DEFAULT_MAX_IN_FLIGHT;
  const retries = retryArg ? Number(retryArg) : DEFAULT_RETRY_COUNT;

  if (limitArg && (!Number.isFinite(limit) || limit <= 0)) {
    throw new Error(`Invalid --limit value: ${limitArg}`);
  }

  if (!Number.isFinite(maxInFlight) || maxInFlight <= 0) {
    throw new Error(`Invalid --max-in-flight value: ${maxInFlightArg}`);
  }

  if (!Number.isFinite(retries) || retries < 1) {
    throw new Error(`Invalid --retries value: ${retryArg}`);
  }

  const resolvedOutputDb = outputDb
    ? path.resolve(outputDb)
    : path.resolve(outputDir, DEFAULT_OUTPUT_DB_NAME);

  return {
    sourceDb: path.resolve(sourceDb),
    outputDir: path.resolve(outputDir),
    outputDb: resolvedOutputDb,
    imagesDirName: DEFAULT_IMAGES_DIR_NAME,
    limit,
    maxInFlight,
    retries,
    includePlaceholders,
    seedOnly,
  };
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

function queryCultivarRows(
  sourceDbPath: string,
  options: { limit?: number; includePlaceholders: boolean },
) {
  const placeholderFilter = options.includePlaceholders
    ? ""
    : "AND json_extract(first_image_json, '$.full') NOT LIKE '%cultivar-search-placeholder.png%'";

  const limitClause = options.limit ? `LIMIT ${options.limit}` : "";

  const sql = `
SELECT
  id,
  post_id,
  post_title,
  json_extract(first_image_json, '$.full') AS img_url
FROM cultivars
WHERE json_extract(first_image_json, '$.full') IS NOT NULL
  AND json_extract(first_image_json, '$.full') <> ''
  ${placeholderFilter}
ORDER BY id
${limitClause};
`;

  return sqliteReadJson<CultivarImageRow>(sourceDbPath, sql);
}

function toSqlString(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replaceAll("'", "''")}'`;
}

function ensureOutputDbSchema(dbPath: string) {
  runSql(
    dbPath,
    `
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS cultivar_images (
  id TEXT PRIMARY KEY,
  post_id TEXT,
  post_title TEXT,
  img_url TEXT NOT NULL,
  local_relative_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  notes TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempted_at TEXT,
  downloaded_at TEXT,
  edit_status TEXT NOT NULL DEFAULT 'pending',
  edited_relative_path TEXT,
  edit_model TEXT,
  edit_prompt TEXT,
  edited_source_url TEXT,
  edit_error TEXT,
  edit_notes TEXT,
  edit_attempt_count INTEGER NOT NULL DEFAULT 0,
  edit_last_attempted_at TEXT,
  edited_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_cultivar_images_post_id ON cultivar_images(post_id);
CREATE INDEX IF NOT EXISTS idx_cultivar_images_status ON cultivar_images(status);
CREATE INDEX IF NOT EXISTS idx_cultivar_images_edit_status ON cultivar_images(edit_status);
`,
  );

  const columns = sqliteReadJson<TableColumnRow>(
    dbPath,
    "SELECT name FROM pragma_table_info('cultivar_images');",
  );
  const names = new Set(columns.map((column) => column.name));

  const requiredColumns = [
    { name: "local_relative_path", type: "TEXT" },
    { name: "status", type: "TEXT NOT NULL DEFAULT 'pending'" },
    { name: "error", type: "TEXT" },
    { name: "notes", type: "TEXT" },
    { name: "attempt_count", type: "INTEGER NOT NULL DEFAULT 0" },
    { name: "last_attempted_at", type: "TEXT" },
    { name: "downloaded_at", type: "TEXT" },
    { name: "edit_status", type: "TEXT NOT NULL DEFAULT 'pending'" },
    { name: "edited_relative_path", type: "TEXT" },
    { name: "edit_model", type: "TEXT" },
    { name: "edit_prompt", type: "TEXT" },
    { name: "edited_source_url", type: "TEXT" },
    { name: "edit_error", type: "TEXT" },
    { name: "edit_notes", type: "TEXT" },
    { name: "edit_attempt_count", type: "INTEGER NOT NULL DEFAULT 0" },
    { name: "edit_last_attempted_at", type: "TEXT" },
    { name: "edited_at", type: "TEXT" },
  ] as const;

  const alters: string[] = [];
  for (const column of requiredColumns) {
    if (!names.has(column.name)) {
      alters.push(
        `ALTER TABLE cultivar_images ADD COLUMN ${column.name} ${column.type};`,
      );
    }
  }

  if (alters.length > 0) {
    runSql(dbPath, alters.join("\n"));
  }
}

function seedOutputDb(dbPath: string, rows: CultivarImageRow[]) {
  if (rows.length === 0) return;

  const sqlLines: string[] = ["BEGIN;"];

  for (const row of rows) {
    sqlLines.push(
      `INSERT INTO cultivar_images (id, post_id, post_title, img_url) VALUES (${toSqlString(row.id)}, ${toSqlString(row.post_id)}, ${toSqlString(row.post_title)}, ${toSqlString(row.img_url)}) ON CONFLICT(id) DO UPDATE SET post_id=excluded.post_id, post_title=excluded.post_title, img_url=excluded.img_url;`,
    );
  }

  sqlLines.push("COMMIT;");
  runSql(dbPath, sqlLines.join("\n"));
}

function queryRowsToProcess(dbPath: string, limit?: number): CultivarImageRow[] {
  const limitClause = limit ? `LIMIT ${limit}` : "";
  const sql = `
SELECT
  id,
  post_id,
  post_title,
  img_url
FROM cultivar_images
WHERE status IS NULL
  OR status <> 'downloaded'
  OR local_relative_path IS NULL
  OR local_relative_path = ''
ORDER BY id
${limitClause};
`;
  return sqliteReadJson<CultivarImageRow>(dbPath, sql);
}

function updateRowStart(dbPath: string, id: string) {
  runSql(
    dbPath,
    `
UPDATE cultivar_images
SET
  status = 'downloading',
  error = NULL,
  notes = 'Download started',
  attempt_count = COALESCE(attempt_count, 0) + 1,
  last_attempted_at = datetime('now')
WHERE id = ${toSqlString(id)};
`,
  );
}

function updateRowSuccess(
  dbPath: string,
  row: DownloadedRow,
  note: string,
) {
  runSql(
    dbPath,
    `
UPDATE cultivar_images
SET
  local_relative_path = ${toSqlString(row.local_relative_path)},
  status = 'downloaded',
  error = NULL,
  notes = ${toSqlString(note)},
  downloaded_at = datetime('now')
WHERE id = ${toSqlString(row.id)};
`,
  );
}

function updateRowFailure(
  dbPath: string,
  row: CultivarImageRow,
  errorMessage: string,
) {
  runSql(
    dbPath,
    `
UPDATE cultivar_images
SET
  status = 'failed',
  error = ${toSqlString(errorMessage)},
  notes = 'Download failed'
WHERE id = ${toSqlString(row.id)};
`,
  );
}

function detectExtension(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const ext = path.extname(parsedUrl.pathname).toLowerCase();
    if (ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".webp") {
      return ext;
    }
  } catch {
    // Fall through to default extension.
  }

  return ".jpg";
}

function buildFileBaseName(row: CultivarImageRow): string {
  const postTitlePart = row.post_title ?? "";
  const postIdPart = row.post_id ?? "";
  const primary = slugify(`${postTitlePart} ${postIdPart}`);

  if (primary.length > 0) {
    return primary;
  }

  const fallback = slugify(`${row.id} ${postIdPart}`);
  if (fallback.length > 0) {
    return fallback;
  }

  return row.id;
}

async function fetchWithRetry(url: string, retries: number): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
      } else {
        return response;
      }
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to download ${url}`);
}

async function downloadImage(
  row: CultivarImageRow,
  outputDir: string,
  imagesDirName: string,
  retries: number,
): Promise<DownloadedRow> {
  const extension = detectExtension(row.img_url);
  const fileName = `${buildFileBaseName(row)}${extension}`;
  const localRelativePath = path
    .join(imagesDirName, fileName)
    .replaceAll(path.sep, "/");
  const absolutePath = path.join(outputDir, localRelativePath);

  const reusedExistingFile = fs.existsSync(absolutePath);

  if (!reusedExistingFile) {
    const response = await fetchWithRetry(row.img_url, retries);
    const body = response.body;
    if (!body) {
      throw new Error("Response body missing");
    }

    await pipeline(
      Readable.fromWeb(body as globalThis.ReadableStream<Uint8Array>),
      fs.createWriteStream(absolutePath),
    );
  }

  return {
    ...row,
    local_relative_path: localRelativePath,
    reused_existing_file: reusedExistingFile,
  };
}

async function run() {
  const options = parseArgs();
  fs.mkdirSync(options.outputDir, { recursive: true });
  fs.mkdirSync(path.join(options.outputDir, options.imagesDirName), {
    recursive: true,
  });

  console.log("[cultivar-image-mirror] Ensuring output DB schema...");
  ensureOutputDbSchema(options.outputDb);

  console.log("[cultivar-image-mirror] Loading rows from source DB...");
  const sourceRows = queryCultivarRows(options.sourceDb, {
    limit: options.limit,
    includePlaceholders: options.includePlaceholders,
  });
  console.log(`[cultivar-image-mirror] Source rows found: ${sourceRows.length}`);

  console.log("[cultivar-image-mirror] Seeding output DB rows...");
  seedOutputDb(options.outputDb, sourceRows);

  if (options.seedOnly) {
    console.log(
      "[cultivar-image-mirror] Seed-only mode enabled. Skipping downloads.",
    );
    console.log(`[cultivar-image-mirror] Output DB: ${options.outputDb}`);
    return;
  }

  const rows = queryRowsToProcess(options.outputDb, options.limit);
  console.log(`[cultivar-image-mirror] Rows queued for download: ${rows.length}`);

  const failures: Array<{ id: string; url: string; error: string }> = [];
  let currentIndex = 0;
  let completed = 0;
  let downloadedCount = 0;
  let resumedFromDiskCount = 0;

  async function worker() {
    while (true) {
      const nextIndex = currentIndex;
      currentIndex += 1;
      if (nextIndex >= rows.length) return;

      const row = rows[nextIndex]!;

      try {
        updateRowStart(options.outputDb, row.id);

        const result = await downloadImage(
          row,
          options.outputDir,
          options.imagesDirName,
          options.retries,
        );

        const note = result.reused_existing_file
          ? "Reused existing local file"
          : "Downloaded";
        if (result.reused_existing_file) {
          resumedFromDiskCount += 1;
        } else {
          downloadedCount += 1;
        }

        updateRowSuccess(options.outputDb, result, note);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        updateRowFailure(options.outputDb, row, errorMessage);
        failures.push({
          id: row.id,
          url: row.img_url,
          error: errorMessage,
        });
      } finally {
        completed += 1;
        if (completed % 100 === 0 || completed === rows.length) {
          console.log(
            `[cultivar-image-mirror] Progress: ${completed}/${rows.length} (failed=${failures.length})`,
          );
        }
      }
    }
  }

  const workerCount = Math.min(options.maxInFlight, rows.length || 1);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const failureLogPath = path.join(options.outputDir, "download-failures.json");
  fs.writeFileSync(failureLogPath, JSON.stringify(failures, null, 2), "utf8");

  console.log(
    `[cultivar-image-mirror] Done. newly-downloaded=${downloadedCount}, reused-existing=${resumedFromDiskCount}, failed=${failures.length}`,
  );
  console.log(`[cultivar-image-mirror] Output DB: ${options.outputDb}`);
  console.log(
    `[cultivar-image-mirror] Images dir: ${path.join(options.outputDir, options.imagesDirName)}`,
  );
  console.log(`[cultivar-image-mirror] Failures log: ${failureLogPath}`);
}

run().catch((error) => {
  console.error("[cultivar-image-mirror] Fatal error:", error);
  process.exitCode = 1;
});
