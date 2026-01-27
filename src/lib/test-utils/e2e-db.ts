import path from "node:path";
import fs from "node:fs";
import { PrismaClient } from "../../../prisma/generated/sqlite-client/index.js";

// Export the Prisma client type for use in e2e helpers/tests
export type E2EPrismaClient = PrismaClient;

const SCHEMA_DIR = path.resolve(process.cwd(), "prisma");

function normalizeDbPath(sqliteUrl: string) {
  const p = sqliteUrl.replace(/^file:/, "");
  return path.isAbsolute(p) ? p : path.resolve(SCHEMA_DIR, p);
}

export const DEFAULT_TEMP_DB_PATH = path.join(
  "tests",
  ".tmp",
  "ui-listings.sqlite",
);

export function resolveTempDbUrl(pathOrUrl?: string) {
  const value = pathOrUrl ?? DEFAULT_TEMP_DB_PATH;
  if (value.startsWith("file:")) return value;
  return path.isAbsolute(value) ? `file:${value}` : `file:${value}`;
}

export function resolveTempDbPath(pathOrUrl?: string) {
  return normalizeDbPath(resolveTempDbUrl(pathOrUrl));
}

export function assertSafeTestDbUrl(sqliteUrl: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run e2e DB helpers in production.");
  }
  if (!sqliteUrl.startsWith("file:")) {
    throw new Error(`Test DB URL must start with "file:". Got: ${sqliteUrl}`);
  }
  const absolute = normalizeDbPath(sqliteUrl);
  const allowedRoots = [
    path.resolve(process.cwd(), "tests", ".tmp") + path.sep,
    path.resolve(process.cwd(), "prisma", "tests", ".tmp") + path.sep,
  ];
  const isAllowed = allowedRoots.some((root) => absolute.startsWith(root));
  if (!isAllowed) {
    throw new Error(
      `Test DB path must be under tests/.tmp. Got: ${absolute}.`,
    );
  }
}

export function getTempDbUrl(url?: string) {
  const resolved = url ?? process.env.LOCAL_DATABASE_URL;
  if (!resolved) throw new Error("LOCAL_DATABASE_URL is not set");
  assertSafeTestDbUrl(resolved);
  return resolved;
}

export function ensureLocalTempDbSafety(url?: string) {
  if (process.env.BASE_URL) {
    throw new Error(
      "ensureLocalTempDbSafety: BASE_URL set; should not seed/clear in URL mode.",
    );
  }
  if (process.env.USE_TURSO_DB === "true") {
    throw new Error(
      "ensureLocalTempDbSafety: USE_TURSO_DB=true is not allowed in local e2e mode.",
    );
  }
  getTempDbUrl(url);
}

export async function withTempE2EDb<T>(
  fn: (db: PrismaClient) => Promise<T> | T,
  opts?: { clearFirst?: boolean },
): Promise<T> {
  // If LOCAL_DATABASE_URL is not set, try to read it from the file written by global-setup
  if (!process.env.LOCAL_DATABASE_URL) {
    const metaFile = path.join(
      process.cwd(),
      "tests",
      ".tmp",
      "e2e-db-path.txt",
    );
    try {
      const dbPath = fs.readFileSync(metaFile, "utf8").trim();
      if (dbPath) {
        // Ensure path is absolute and prepend file: prefix
        const absolutePath = path.isAbsolute(dbPath)
          ? dbPath
          : path.resolve(process.cwd(), dbPath);
        process.env.LOCAL_DATABASE_URL = `file:${absolutePath}`;
      }
    } catch {
      // File doesn't exist, safety check below will fail with clear error
    }
  }

  // Fail fast if safety requirements not met (e.g., BASE_URL mode, wrong DB path)
  ensureLocalTempDbSafety();

  const safeUrl = getTempDbUrl();
  const db = new PrismaClient({
    datasources: { db: { url: safeUrl } },
    log: ["error"],
  });
  await db.$connect();
  try {
    if (opts?.clearFirst !== false) {
      // Delete in dependency order to satisfy foreign keys
      await db.image.deleteMany();
      // Clear join table BEFORE parent tables (schema guarantees this table exists)
      await db.$executeRaw`DELETE FROM "_ListToListing"`;
      await db.list.deleteMany();
      await db.listing.deleteMany();
      await db.userProfile.deleteMany();
      await db.ahsListing.deleteMany();
      await db.keyValue.deleteMany();
      await db.user.deleteMany();
    }
    return await fn(db);
  } finally {
    await db.$disconnect();
  }
}
