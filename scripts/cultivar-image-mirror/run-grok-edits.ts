import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

interface EditableRow {
  id: string;
  post_id: string | null;
  post_title: string | null;
  img_url: string;
  local_relative_path: string | null;
}

interface UrlImageResult {
  editedSourceUrl: string;
}

interface BinaryImageResult {
  editedBinaryBase64: string;
}

type EditResult = UrlImageResult | BinaryImageResult;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIR = path.resolve(SCRIPT_DIR, "output");
const DEFAULT_DB_NAME = "cultivar-images.sqlite";
const DEFAULT_EDITED_DIR_NAME = "edited-images";
const DEFAULT_MODEL = "grok-imagine-image";
const DEFAULT_MAX_IN_FLIGHT = 2;
const DEFAULT_RETRY_COUNT = 2;
const REQUEST_TIMEOUT_MS = 60_000;

function parseArgs() {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const index = args.indexOf(flag);
    if (index === -1) return undefined;
    return args[index + 1];
  };

  const outputDir = path.resolve(getArg("--output-dir") ?? DEFAULT_OUTPUT_DIR);
  const dbPath = path.resolve(
    getArg("--db") ?? path.join(outputDir, DEFAULT_DB_NAME),
  );
  const editedDirName = getArg("--edited-dir-name") ?? DEFAULT_EDITED_DIR_NAME;
  const limitArg = getArg("--limit");
  const maxInFlightArg = getArg("--max-in-flight");
  const retriesArg = getArg("--retries");
  const model = getArg("--model") ?? DEFAULT_MODEL;
  const prompt = getArg("--prompt");

  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Missing required --prompt");
  }

  const limit = limitArg ? Number(limitArg) : undefined;
  const maxInFlight = maxInFlightArg
    ? Number(maxInFlightArg)
    : DEFAULT_MAX_IN_FLIGHT;
  const retries = retriesArg ? Number(retriesArg) : DEFAULT_RETRY_COUNT;

  if (limitArg && (!Number.isFinite(limit) || limit <= 0)) {
    throw new Error(`Invalid --limit value: ${limitArg}`);
  }

  if (!Number.isFinite(maxInFlight) || maxInFlight <= 0) {
    throw new Error(`Invalid --max-in-flight value: ${maxInFlightArg}`);
  }

  if (!Number.isFinite(retries) || retries < 1) {
    throw new Error(`Invalid --retries value: ${retriesArg}`);
  }

  return {
    outputDir,
    dbPath,
    editedDirName,
    editedDirPath: path.join(outputDir, editedDirName),
    prompt: prompt.trim(),
    model,
    limit,
    maxInFlight,
    retries,
  };
}

function sqlEscape(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlValue(value: string | null): string {
  return value === null ? "NULL" : sqlEscape(value);
}

function runSql(dbPath: string, sql: string) {
  execFileSync("sqlite3", [dbPath], {
    input: `${sql}\n`,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
  });
}

function sqliteReadJson<T>(dbPath: string, sql: string): T[] {
  const output = execFileSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
  });
  const trimmed = output.trim();
  if (!trimmed) return [];
  return JSON.parse(trimmed) as T[];
}

function ensureOutputDbSchema(dbPath: string) {
  runSql(
    dbPath,
    `
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
CREATE INDEX IF NOT EXISTS idx_cultivar_images_edit_status ON cultivar_images(edit_status);
`,
  );
}

function queryRowsToEdit(dbPath: string, limit?: number): EditableRow[] {
  const limitClause = limit ? `LIMIT ${limit}` : "";
  const sql = `
SELECT
  id,
  post_id,
  post_title,
  img_url,
  local_relative_path
FROM cultivar_images
WHERE status = 'downloaded'
  AND local_relative_path IS NOT NULL
  AND local_relative_path <> ''
  AND (edited_relative_path IS NULL OR edited_relative_path = '')
  AND (edit_status IS NULL OR edit_status <> 'edited')
ORDER BY id
${limitClause};
`;
  return sqliteReadJson<EditableRow>(dbPath, sql);
}

function updateEditStart(
  dbPath: string,
  rowId: string,
  model: string,
  prompt: string,
) {
  runSql(
    dbPath,
    `
UPDATE cultivar_images
SET
  edit_status = 'editing',
  edit_model = ${sqlEscape(model)},
  edit_prompt = ${sqlEscape(prompt)},
  edit_error = NULL,
  edit_notes = 'Edit started',
  edit_attempt_count = COALESCE(edit_attempt_count, 0) + 1,
  edit_last_attempted_at = datetime('now')
WHERE id = ${sqlEscape(rowId)};
`,
  );
}

function updateEditSuccess(
  dbPath: string,
  rowId: string,
  editedRelativePath: string,
  editedSourceUrl: string | null,
  note: string,
) {
  runSql(
    dbPath,
    `
UPDATE cultivar_images
SET
  edit_status = 'edited',
  edited_relative_path = ${sqlEscape(editedRelativePath)},
  edited_source_url = ${sqlValue(editedSourceUrl)},
  edit_error = NULL,
  edit_notes = ${sqlEscape(note)},
  edited_at = datetime('now')
WHERE id = ${sqlEscape(rowId)};
`,
  );
}

function updateEditFailure(dbPath: string, rowId: string, errorMessage: string) {
  runSql(
    dbPath,
    `
UPDATE cultivar_images
SET
  edit_status = 'failed',
  edit_error = ${sqlEscape(errorMessage)},
  edit_notes = 'Edit request failed'
WHERE id = ${sqlEscape(rowId)};
`,
  );
}

async function callGrokEditApi(
  apiKey: string,
  model: string,
  prompt: string,
  imageUrl: string,
): Promise<EditResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.x.ai/v1/images/edits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        image: {
          url: imageUrl,
          type: "image_url",
        },
      }),
      signal: controller.signal,
    });

    const bodyText = await response.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      // If JSON parsing fails, keep text for error context.
    }

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${typeof parsed === "object" && parsed ? JSON.stringify(parsed) : bodyText}`,
      );
    }

    const candidates: unknown[] = [];
    if (parsed && typeof parsed === "object") {
      const root = parsed as Record<string, unknown>;
      candidates.push(root);
      if (Array.isArray(root.data)) {
        candidates.push(...root.data);
      }
    }

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== "object") continue;
      const record = candidate as Record<string, unknown>;
      const urlCandidate = record.url;
      if (typeof urlCandidate === "string" && urlCandidate.length > 0) {
        return { editedSourceUrl: urlCandidate };
      }
      const b64Candidate = record.b64_json;
      if (typeof b64Candidate === "string" && b64Candidate.length > 0) {
        return { editedBinaryBase64: b64Candidate };
      }
    }

    throw new Error(
      "Successful API response did not include a usable image URL or b64 payload",
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadUrlToFile(url: string, destinationPath: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download edited URL: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destinationPath, buffer);
}

function writeBase64ToFile(base64Content: string, destinationPath: string) {
  const buffer = Buffer.from(base64Content, "base64");
  fs.writeFileSync(destinationPath, buffer);
}

async function processRow(
  row: EditableRow,
  options: ReturnType<typeof parseArgs>,
  apiKey: string,
) {
  if (!row.local_relative_path) {
    throw new Error("Missing local_relative_path");
  }

  const sourceAbsolutePath = path.join(options.outputDir, row.local_relative_path);
  if (!fs.existsSync(sourceAbsolutePath)) {
    throw new Error(`Original file missing: ${row.local_relative_path}`);
  }

  const baseName = path.basename(row.local_relative_path);
  const editedRelativePath = path
    .join(options.editedDirName, baseName)
    .replaceAll(path.sep, "/");
  const editedAbsolutePath = path.join(options.outputDir, editedRelativePath);

  if (fs.existsSync(editedAbsolutePath)) {
    updateEditSuccess(
      options.dbPath,
      row.id,
      editedRelativePath,
      null,
      "Reused existing edited file",
    );
    return;
  }

  updateEditStart(options.dbPath, row.id, options.model, options.prompt);

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= options.retries; attempt += 1) {
    try {
      const result = await callGrokEditApi(apiKey, options.model, options.prompt, row.img_url);

      if ("editedSourceUrl" in result) {
        await downloadUrlToFile(result.editedSourceUrl, editedAbsolutePath);
        updateEditSuccess(
          options.dbPath,
          row.id,
          editedRelativePath,
          result.editedSourceUrl,
          "Edited image downloaded from returned URL",
        );
      } else {
        writeBase64ToFile(result.editedBinaryBase64, editedAbsolutePath);
        updateEditSuccess(
          options.dbPath,
          row.id,
          editedRelativePath,
          null,
          "Edited image written from base64 response",
        );
      }

      return;
    } catch (error) {
      lastError = error;
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  updateEditFailure(options.dbPath, row.id, message);
}

async function run() {
  const options = parseArgs();
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing XAI_API_KEY in environment");
  }

  fs.mkdirSync(options.editedDirPath, { recursive: true });
  ensureOutputDbSchema(options.dbPath);

  const rows = queryRowsToEdit(options.dbPath, options.limit);
  console.log(`[grok-edits] Rows queued: ${rows.length}`);

  let currentIndex = 0;
  let completed = 0;
  let failed = 0;

  async function worker() {
    while (true) {
      const index = currentIndex;
      currentIndex += 1;
      if (index >= rows.length) return;

      const row = rows[index]!;
      try {
        await processRow(row, options, apiKey);
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        updateEditFailure(options.dbPath, row.id, message);
      } finally {
        completed += 1;
        if (completed % 25 === 0 || completed === rows.length) {
          console.log(`[grok-edits] Progress: ${completed}/${rows.length} (failed=${failed})`);
        }
      }
    }
  }

  const workerCount = Math.min(options.maxInFlight, rows.length || 1);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  console.log(`[grok-edits] Done. completed=${completed}, failed=${failed}`);
  console.log(`[grok-edits] Edited images directory: ${options.editedDirPath}`);
}

run().catch((error) => {
  console.error("[grok-edits] Fatal error:", error);
  process.exitCode = 1;
});
