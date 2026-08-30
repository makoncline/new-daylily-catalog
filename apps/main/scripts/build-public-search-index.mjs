import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { buildPublicSearchIndex } from "../src/server/search/build-public-search-index.js";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_LOCAL_SOURCE = path.join(
  APP_ROOT,
  "prisma/local-prod-copy-daylily-catalog.db",
);
const DEFAULT_LOCAL_TARGET = path.join(
  APP_ROOT,
  ".tmp/search/cultivar-search.sqlite",
);
const TARGET_WORKER_PATH = path.join(
  APP_ROOT,
  "scripts/build-public-search-index-target.mjs",
);

function parseArgs(args = process.argv.slice(2)) {
  const parsed = new Map();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (typeof arg !== "string" || !arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    if (key !== "source" && key !== "target") {
      throw new Error(`Unknown argument: --${key}`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    parsed.set(key, value);
    index += 1;
  }

  return {
    source: parsed.get("source") ?? DEFAULT_LOCAL_SOURCE,
    target: parsed.get("target") ?? DEFAULT_LOCAL_TARGET,
  };
}

function normalizeLocalPath(input) {
  if (input.includes("://") && !input.startsWith("file:")) {
    throw new Error(`Expected a local database path. Received: ${input}`);
  }

  const withoutScheme = input.startsWith("file:") ? input.slice(5) : input;
  if (withoutScheme.length === 0) {
    throw new Error("Database path cannot be empty.");
  }

  return path.resolve(APP_ROOT, withoutScheme);
}

async function main() {
  const args = parseArgs();
  const sourcePath = normalizeLocalPath(args.source);
  const targetPath = normalizeLocalPath(args.target);

  if (!existsSync(sourcePath)) {
    throw new Error(`Source database does not exist: ${sourcePath}`);
  }
  if (sourcePath === targetPath) {
    throw new Error("Source and target database paths must be different.");
  }

  const sourceDb = new PrismaClient({
    adapter: new PrismaLibSql(
      { url: `file:${sourcePath}` },
      { timestampFormat: "unixepoch-ms" },
    ),
    log: ["error"],
  });

  try {
    console.log("Building public search index");
    console.log(`Source DB: ${sourcePath}`);
    console.log(`Target DB: ${targetPath}`);

    const result = await buildPublicSearchIndex({
      sourceDb,
      sourceLabel: sourcePath,
      targetPath,
      targetWorkerPath: TARGET_WORKER_PATH,
    });

    console.log(`cultivars|${result.cultivars}`);
    console.log(`linkedListings|${result.linkedListings}`);
    console.log(`quickCheck|${result.quickCheck}`);
    console.log(`Built public search index in ${result.elapsedMs}ms`);
  } finally {
    await sourceDb.$disconnect();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
