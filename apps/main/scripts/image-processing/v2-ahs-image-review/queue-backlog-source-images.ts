import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import {
  ensureSchema,
  openQueueDb,
  ORIGINALS_DIR,
  PROD_COPY_DB_PATH,
  REVIEW_DB_PATH,
} from "./review-db.mjs";

interface BacklogRow {
  id: string;
  postTitle: string | null;
  imageUrl: string;
  sourceKind: "v2" | "legacy";
}

interface ParsedArgs {
  dryRun: boolean;
  limit: number | null;
  mode: "backlog" | "catchup";
}

const CLAIMABLE_STATUSES = ["pending", "processing", "failed", "rejected"];
const RETRIES = 3;
const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = Number(
  process.env.V2_AHS_IMAGE_RETRY_DELAY_MS ?? "2000",
);
const RATE_LIMIT_DELAY_MS = Number(
  process.env.V2_AHS_IMAGE_RATE_LIMIT_DELAY_MS ?? "10000",
);

class HttpError extends Error {
  readonly status: number;
  readonly retryAfterMs: number | null;

  constructor(status: number, retryAfterMs: number | null) {
    super(`HTTP ${status}`);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  let dryRun = false;
  let limit: number | null = null;
  let mode: ParsedArgs["mode"] = "backlog";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--mode") {
      const value = args[index + 1];
      if (value !== "backlog" && value !== "catchup") {
        throw new Error(`Invalid --mode value: ${value}`);
      }
      mode = value;
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      limit = Number(args[index + 1]);
      index += 1;
      continue;
    }

    if (arg?.startsWith("--limit=")) {
      limit = Number(arg.slice("--limit=".length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (
    (mode === "backlog" && limit === null) ||
    (limit !== null && (!Number.isInteger(limit) || limit < 1))
  ) {
    throw new Error("Pass a positive integer with --limit.");
  }

  return { dryRun, limit, mode };
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function selectBacklogRows(
  database: DatabaseSync,
  excludedIds: ReadonlySet<string>,
  limit: number,
): BacklogRow[] {
  const rows = database
    .prepare(
      `
        SELECT
          cr."id",
          COALESCE(
            NULLIF(v2."post_title", ''),
            NULLIF(ahs."name", ''),
            NULLIF(cr."normalizedName", '')
          ) AS "post_title",
          COALESCE(
            NULLIF(v2."image_url", ''),
            NULLIF(ahs."ahsImageUrl", '')
          ) AS "image_url",
          CASE
            WHEN NULLIF(v2."image_url", '') IS NOT NULL THEN 'v2'
            ELSE 'legacy'
          END AS "source_kind"
        FROM "CultivarReference" cr
        LEFT JOIN "V2AhsCultivar" v2
          ON v2."id" = cr."v2AhsCultivarId"
        LEFT JOIN "AhsListing" ahs
          ON ahs."id" = cr."ahsId"
        WHERE NOT EXISTS (
            SELECT 1
            FROM "Listing" l
            WHERE l."cultivarReferenceId" = cr."id"
          )
          AND NOT EXISTS (
            SELECT 1
            FROM "ImageAsset" ia
            WHERE ia."cultivarReferenceId" = cr."id"
              AND ia."kind" = 'cultivar'
              AND ia."status" = 'ready'
          )
          AND (
            NULLIF(v2."image_url", '') IS NOT NULL
            OR NULLIF(ahs."ahsImageUrl", '') IS NOT NULL
          )
        ORDER BY
          COALESCE(
            NULLIF(cr."normalizedName", ''),
            NULLIF(v2."post_title", ''),
            NULLIF(ahs."name", ''),
            cr."id"
          ) COLLATE NOCASE,
          cr."id" ASC
      `,
    )
    .all();

  const selected: BacklogRow[] = [];

  for (const row of rows) {
    const id = String(row.id);
    if (excludedIds.has(id)) continue;

    selected.push({
      id,
      postTitle: toOptionalString(row.post_title),
      imageUrl: String(row.image_url),
      sourceKind: row.source_kind === "legacy" ? "legacy" : "v2",
    });

    if (selected.length >= limit) break;
  }

  return selected;
}

export function selectCatchupRows(
  database: DatabaseSync,
  excludedIds: ReadonlySet<string>,
  limit: number | null = null,
): BacklogRow[] {
  const rows = database
    .prepare(
      `
        SELECT DISTINCT
          cr."id",
          COALESCE(
            NULLIF(v2."post_title", ''),
            NULLIF(ahs."name", ''),
            NULLIF(cr."normalizedName", '')
          ) AS "post_title",
          COALESCE(
            NULLIF(v2."image_url", ''),
            NULLIF(ahs."ahsImageUrl", '')
          ) AS "image_url",
          CASE
            WHEN NULLIF(v2."image_url", '') IS NOT NULL THEN 'v2'
            ELSE 'legacy'
          END AS "source_kind"
        FROM "CultivarReference" cr
        JOIN "Listing" l
          ON l."cultivarReferenceId" = cr."id"
        LEFT JOIN "V2AhsCultivar" v2
          ON v2."id" = cr."v2AhsCultivarId"
        LEFT JOIN "AhsListing" ahs
          ON ahs."id" = cr."ahsId"
        WHERE NOT EXISTS (
            SELECT 1
            FROM "ImageAsset" ia
            WHERE ia."cultivarReferenceId" = cr."id"
              AND ia."kind" = 'cultivar'
              AND ia."status" = 'ready'
          )
          AND (
            NULLIF(v2."image_url", '') IS NOT NULL
            OR NULLIF(ahs."ahsImageUrl", '') IS NOT NULL
          )
        ORDER BY cr."id" ASC
      `,
    )
    .all();

  const selected: BacklogRow[] = [];

  for (const row of rows) {
    const id = String(row.id);
    if (excludedIds.has(id)) continue;

    selected.push({
      id,
      postTitle: toOptionalString(row.post_title),
      imageUrl: String(row.image_url),
      sourceKind: row.source_kind === "legacy" ? "legacy" : "v2",
    });

    if (limit !== null && selected.length >= limit) break;
  }

  return selected;
}

function readQueueState() {
  const database = openQueueDb();

  try {
    ensureSchema(database);
    const existingIds = new Set(
      database
        .prepare(`SELECT "id" FROM "v2_image_review_queue"`)
        .all()
        .map((row) => String(row.id)),
    );
    const placeholders = CLAIMABLE_STATUSES.map(() => "?").join(", ");
    const claimableIds = database
      .prepare(
        `
          SELECT "id"
          FROM "v2_image_review_queue"
          WHERE "status" IN (${placeholders})
        `,
      )
      .all(...CLAIMABLE_STATUSES)
      .map((row) => String(row.id));

    return { claimableIds, existingIds };
  } finally {
    database.close();
  }
}

export function findLinkedCultivarIds(
  database: DatabaseSync,
  cultivarReferenceIds: readonly string[],
): string[] {
  if (cultivarReferenceIds.length === 0) return [];

  const linkedStatement = database.prepare(
    `
      SELECT 1
      FROM "Listing"
      WHERE "cultivarReferenceId" = ?
      LIMIT 1
    `,
  );

  return cultivarReferenceIds.filter((id) => linkedStatement.get(id));
}

function getFileExtension(urlString: string): string {
  try {
    const extension = path.extname(new URL(urlString).pathname).toLowerCase();
    if (/^\.[a-z0-9]{1,5}$/i.test(extension)) return extension;
  } catch {}

  return ".jpg";
}

function mapOriginalsById(): Map<string, string> {
  const originals = new Map<string, string>();

  if (!fs.existsSync(ORIGINALS_DIR)) return originals;

  for (const entry of fs.readdirSync(ORIGINALS_DIR, { withFileTypes: true })) {
    if (
      !entry.isFile() ||
      entry.name.startsWith("_") ||
      entry.name.endsWith(".part")
    ) {
      continue;
    }

    originals.set(
      path.parse(entry.name).name,
      path.join(ORIGINALS_DIR, entry.name),
    );
  }

  return originals;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryAfterMs(response: Response): number | null {
  const value = response.headers.get("retry-after");
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.min(60_000, Math.max(0, seconds * 1_000));
  }

  const date = Date.parse(value);
  return Number.isNaN(date)
    ? null
    : Math.min(60_000, Math.max(0, date - Date.now()));
}

async function downloadImage(url: string, outputPath: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const temporaryPath = `${outputPath}.part`;

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new HttpError(response.status, retryAfterMs(response));
    }

    if (!response.body) {
      throw new Error("Empty response body");
    }

    await pipeline(
      Readable.fromWeb(response.body as WebReadableStream),
      fs.createWriteStream(temporaryPath),
    );
    fs.renameSync(temporaryPath, outputPath);
  } finally {
    clearTimeout(timeout);
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
  }
}

async function downloadWithRetries(
  row: BacklogRow,
  outputPath: string,
): Promise<string | null> {
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      await downloadImage(row.imageUrl, outputPath);
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (attempt === RETRIES) return message;

      const delayMs =
        error instanceof HttpError && error.retryAfterMs !== null
          ? error.retryAfterMs
          : error instanceof HttpError && error.status === 429
            ? RATE_LIMIT_DELAY_MS * attempt
            : RETRY_DELAY_MS * attempt;
      console.warn(
        `[v2-image-queue] retry=${attempt}/${RETRIES} delay=${delayMs}ms id=${row.id} error=${message}`,
      );
      await sleep(delayMs);
    }
  }

  return "Download failed";
}

function insertQueueRow(row: BacklogRow, originalPath: string): void {
  const database = openQueueDb();
  const now = new Date().toISOString();

  try {
    ensureSchema(database);
    database
      .prepare(
        `
          INSERT OR IGNORE INTO "v2_image_review_queue" (
            "id",
            "postTitle",
            "originalPath",
            "editedPath",
            "status",
            "attempts",
            "lastError",
            "promptVersion",
            "createdAt",
            "updatedAt"
          ) VALUES (?, ?, ?, NULL, 'pending', 0, NULL, NULL, ?, ?)
        `,
      )
      .run(row.id, row.postTitle, originalPath, now, now);
  } finally {
    database.close();
  }
}

function insertSourceInvalidRow(
  row: BacklogRow,
  originalPath: string,
  error: string,
): void {
  const database = openQueueDb();
  const now = new Date().toISOString();

  try {
    ensureSchema(database);
    database
      .prepare(
        `
          INSERT OR IGNORE INTO "v2_image_review_queue" (
            "id",
            "postTitle",
            "originalPath",
            "editedPath",
            "status",
            "attempts",
            "lastError",
            "promptVersion",
            "createdAt",
            "updatedAt"
          ) VALUES (?, ?, ?, NULL, 'source_invalid', 0, ?, NULL, ?, ?)
        `,
      )
      .run(row.id, row.postTitle, originalPath, error, now, now);
  } finally {
    database.close();
  }
}

async function main() {
  const args = parseArgs();
  const { claimableIds, existingIds } = readQueueState();

  const prodDatabase = new DatabaseSync(PROD_COPY_DB_PATH, {
    open: true,
    readOnly: true,
  });
  let rows: BacklogRow[];

  try {
    if (args.mode === "backlog") {
      const linkedClaimableIds = findLinkedCultivarIds(
        prodDatabase,
        claimableIds,
      );

      if (linkedClaimableIds.length > 0) {
        throw new Error(
          `Refusing to add backlog while ${linkedClaimableIds.length} linked-listing queue rows remain.`,
        );
      }
    }

    rows =
      args.mode === "catchup"
        ? selectCatchupRows(prodDatabase, existingIds, args.limit)
        : selectBacklogRows(prodDatabase, existingIds, args.limit ?? 0);
  } finally {
    prodDatabase.close();
  }

  console.log(
    `[v2-image-queue] mode=${args.mode} selected=${rows.length} limit=${args.limit ?? "all"} db=${PROD_COPY_DB_PATH}`,
  );
  console.log(`[v2-image-queue] reviewDb=${REVIEW_DB_PATH}`);

  if (args.dryRun) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  fs.mkdirSync(ORIGINALS_DIR, { recursive: true });
  const originals = mapOriginalsById();
  let queued = 0;
  let failed = 0;

  for (const row of rows) {
    const existingPath = originals.get(row.id);
    const outputPath =
      existingPath ??
      path.join(ORIGINALS_DIR, `${row.id}${getFileExtension(row.imageUrl)}`);
    const error = existingPath
      ? null
      : await downloadWithRetries(row, outputPath);

    if (error) {
      failed += 1;
      insertSourceInvalidRow(row, outputPath, error);
      console.warn(
        `[v2-image-queue] source_invalid id=${row.id} title=${row.postTitle ?? ""} error=${error}`,
      );
      continue;
    }

    insertQueueRow(row, outputPath);
    queued += 1;
    console.log(
      `[v2-image-queue] queued id=${row.id} title=${row.postTitle ?? ""}`,
    );
  }

  console.log(
    `[v2-image-queue] done mode=${args.mode} queued=${queued} failed=${failed}`,
  );
}

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (scriptPath === fileURLToPath(import.meta.url)) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
