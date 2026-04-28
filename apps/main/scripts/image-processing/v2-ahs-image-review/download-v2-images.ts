import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

interface ImageRow {
  id: string;
  post_title: string | null;
  image_url: string;
}

interface ParsedArgs {
  limit: number | null;
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../../..");
const PROD_DB_PATH = path.join(
  REPO_ROOT,
  "prisma",
  "local-prod-copy-daylily-catalog.db",
);
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, "downloads", "v2-ahs-images");
const CONCURRENCY = 3;
const RETRIES = 3;
const REQUEST_TIMEOUT_MS = 30_000;
const FAILURE_LOG_NAME = "_failures.tsv";
const RETRY_DELAY_MS = 2_000;
const RATE_LIMIT_DELAY_MS = 10_000;

class HttpError extends Error {
  status: number;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");

  let limit: number | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--limit") {
      const rawLimit = Number(args[index + 1] ?? "");
      if (!Number.isInteger(rawLimit) || rawLimit < 1) {
        throw new Error(`Invalid --limit value: ${args[index + 1]}`);
      }
      limit = rawLimit;
      index += 1;
      continue;
    }

    if (arg?.startsWith("--limit=")) {
      const rawLimit = Number(arg.slice("--limit=".length));
      if (!Number.isInteger(rawLimit) || rawLimit < 1) {
        throw new Error(`Invalid --limit value: ${arg}`);
      }
      limit = rawLimit;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { limit };
}

function loadImageRows(limit: number | null): ImageRow[] {
  const database = new DatabaseSync(PROD_DB_PATH, { open: true, readOnly: true });

  try {
    const query = `
      SELECT id, post_title, image_url
      FROM "V2AhsCultivar"
      WHERE image_url IS NOT NULL
        AND image_url <> ''
      ORDER BY id
      ${limit ? "LIMIT ?" : ""}
    `;

    const statement = database.prepare(query);
    const result = (limit ? statement.all(limit) : statement.all()) as Array<
      Record<string, unknown>
    >;

    return result.map((row) => ({
      id: String(row.id),
      post_title:
        typeof row.post_title === "string" ? row.post_title : row.post_title == null ? null : String(row.post_title),
      image_url: String(row.image_url),
    }));
  } finally {
    database.close();
  }
}

function getFileExtension(urlString: string): string {
  try {
    const url = new URL(urlString);
    const extension = path.extname(url.pathname).toLowerCase();
    if (/^\.[a-z0-9]{1,5}$/i.test(extension)) {
      return extension;
    }
  } catch {
    // Fall through to the default.
  }

  return ".jpg";
}

function getOutputPath(outDir: string, row: ImageRow): string {
  return path.join(outDir, `${row.id}${getFileExtension(row.image_url)}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function downloadImage(url: string, outputPath: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

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
      throw new HttpError(response.status);
    }

    if (!response.body) {
      throw new Error("Empty response body");
    }

    const tempPath = `${outputPath}.part`;
    await pipeline(
      Readable.fromWeb(response.body as WebReadableStream),
      fs.createWriteStream(tempPath),
    );
    fs.renameSync(tempPath, outputPath);
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const args = parseArgs();
  const rows = loadImageRows(args.limit);

  fs.mkdirSync(DEFAULT_OUT_DIR, { recursive: true });

  const failures: string[] = [];
  let completed = 0;
  let skipped = 0;
  let failed = 0;
  let nextIndex = 0;

  console.log(
    `[v2-images] queue=${rows.length} concurrency=${CONCURRENCY} db=${PROD_DB_PATH} out=${DEFAULT_OUT_DIR}`,
  );

  async function worker(workerId: number) {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      const row = rows[currentIndex];
      if (!row) {
        return;
      }

      const outputPath = getOutputPath(DEFAULT_OUT_DIR, row);
      if (fs.existsSync(outputPath)) {
        skipped += 1;
        continue;
      }

      let lastError: unknown = null;

      for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
        try {
          await downloadImage(row.image_url, outputPath);
          completed += 1;

          if (completed % 100 === 0 || completed === rows.length) {
            console.log(
              `[v2-images] downloaded=${completed} skipped=${skipped} failed=${failed}`,
            );
          }

          lastError = null;
          break;
        } catch (error) {
          lastError = error;

          const tempPath = `${outputPath}.part`;
          if (fs.existsSync(tempPath)) {
            fs.rmSync(tempPath, { force: true });
          }

          if (attempt < RETRIES) {
            const delayMs =
              error instanceof HttpError && error.status === 429
                ? RATE_LIMIT_DELAY_MS * attempt
                : RETRY_DELAY_MS * attempt;
            console.warn(
              `[v2-images] worker=${workerId} retry=${attempt}/${RETRIES} delay=${delayMs}ms id=${row.id} url=${row.image_url}`,
            );
            await sleep(delayMs);
          }
        }
      }

      if (lastError) {
        failed += 1;
        const message =
          lastError instanceof Error ? lastError.message : String(lastError);
        failures.push(
          [row.id, row.post_title ?? "", row.image_url, message].join("\t"),
        );
        console.warn(
          `[v2-images] failed id=${row.id} title=${row.post_title ?? ""} error=${message}`,
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, index) => worker(index + 1)),
  );

  const failurePath = path.join(DEFAULT_OUT_DIR, FAILURE_LOG_NAME);
  if (failures.length > 0) {
    fs.writeFileSync(
      failurePath,
      ["id\tpost_title\timage_url\terror", ...failures].join("\n") + "\n",
      "utf8",
    );
  } else if (fs.existsSync(failurePath)) {
    fs.rmSync(failurePath, { force: true });
  }

  console.log(
    `[v2-images] done downloaded=${completed} skipped=${skipped} failed=${failed}`,
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
