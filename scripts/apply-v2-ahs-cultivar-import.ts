import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

interface ImportManifestChunk {
  fileName: string;
  rowCount: number;
  batchCount: number;
  sizeBytes: number;
}

interface ImportManifest {
  sourceDbPath: string;
  totalRows: number;
  totalBatches: number;
  batchSize: number;
  maxBatchesPerChunk: number;
  chunkCount: number;
  chunks: ImportManifestChunk[];
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_IMPORT_DIR = path.join(
  REPO_ROOT,
  "prisma",
  "data-migrations",
  "20260407_upsert_v2_ahs_cultivars",
);
const DEFAULT_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

interface ParsedArgs {
  dbName: string | null;
  sqlitePath: string | null;
  importDir: string;
  retries: number;
  instance: string | null;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");

  let dbName: string | null = null;
  let sqlitePath: string | null = null;
  let importDir = DEFAULT_IMPORT_DIR;
  let retries = DEFAULT_RETRIES;
  let instance: string | null = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (!arg) {
      continue;
    }

    if (arg === "--db") {
      dbName = args[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (arg.startsWith("--db=")) {
      dbName = arg.slice("--db=".length);
      continue;
    }

    if (arg === "--sqlite") {
      sqlitePath = args[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (arg.startsWith("--sqlite=")) {
      sqlitePath = path.resolve(REPO_ROOT, arg.slice("--sqlite=".length));
      continue;
    }

    if (arg === "--import-dir") {
      importDir = path.resolve(REPO_ROOT, args[i + 1] ?? "");
      i += 1;
      continue;
    }

    if (arg.startsWith("--import-dir=")) {
      importDir = path.resolve(REPO_ROOT, arg.slice("--import-dir=".length));
      continue;
    }

    if (arg === "--retries") {
      retries = Number(args[i + 1] ?? DEFAULT_RETRIES);
      i += 1;
      continue;
    }

    if (arg.startsWith("--retries=")) {
      retries = Number(arg.slice("--retries=".length));
      continue;
    }

    if (arg === "--instance") {
      instance = args[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (arg.startsWith("--instance=")) {
      instance = arg.slice("--instance=".length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if ((dbName == null) === (sqlitePath == null)) {
    throw new Error("Provide exactly one of --db <turso-db-name> or --sqlite <db-path>");
  }

  if (sqlitePath) {
    sqlitePath = path.resolve(REPO_ROOT, sqlitePath);
  }

  if (!Number.isInteger(retries) || retries < 1) {
    throw new Error(`Invalid --retries value: ${retries}`);
  }

  return {
    dbName,
    sqlitePath,
    importDir,
    retries,
    instance,
  };
}

function readManifest(importDir: string) {
  const manifestPath = path.join(importDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Missing import manifest at ${manifestPath}. Run npx tsx scripts/generate-v2-ahs-cultivar-data-sql.ts first.`,
    );
  }

  return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ImportManifest;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function runChunkAgainstTurso(
  dbName: string,
  sql: string,
  instance: string | null,
) {
  const args = ["db", "shell", dbName];
  if (instance) {
    args.push("--instance", instance);
  }

  execFileSync("turso", args, {
    cwd: REPO_ROOT,
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
    maxBuffer: 1024 * 1024,
  });
}

function runChunkAgainstSqlite(sqlitePath: string, sql: string) {
  execFileSync("sqlite3", [sqlitePath], {
    cwd: REPO_ROOT,
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
    maxBuffer: 1024 * 1024,
  });
}

async function main() {
  const args = parseArgs();
  const manifest = readManifest(args.importDir);

  console.log(
    `[v2-import] applying ${manifest.chunkCount} chunks from ${args.importDir}`,
  );
  console.log(
    `[v2-import] source rows ${manifest.totalRows}, batches ${manifest.totalBatches}, batches/chunk ${manifest.maxBatchesPerChunk}`,
  );

  for (const [index, chunk] of manifest.chunks.entries()) {
    const chunkPath = path.join(args.importDir, chunk.fileName);
    const chunkLabel = `${index + 1}/${manifest.chunks.length} ${chunk.fileName}`;
    const sql = fs.readFileSync(chunkPath, "utf8");

    for (let attempt = 1; attempt <= args.retries; attempt += 1) {
      try {
        console.log(
          `[v2-import] ${chunkLabel} rows=${chunk.rowCount} size=${chunk.sizeBytes}B attempt=${attempt}`,
        );

        if (args.dbName) {
          runChunkAgainstTurso(args.dbName, sql, args.instance);
        } else if (args.sqlitePath) {
          runChunkAgainstSqlite(args.sqlitePath, sql);
        }

        break;
      } catch (error) {
        if (attempt >= args.retries) {
          throw error;
        }

        console.warn(
          `[v2-import] retrying ${chunk.fileName} after failure (${attempt}/${args.retries})`,
        );
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  console.log("[v2-import] import complete");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
