import path from "node:path";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

export type E2EPrismaClient = PrismaClient;

function normalizeDbPath(sqliteUrl: string) {
  const p = sqliteUrl.replace(/^file:/, "");
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

export const DEFAULT_TEMP_DB_PATH = path.join(
  "tests",
  ".tmp",
  "ui-listings.sqlite",
);

export function resolveTempDbUrl(pathOrUrl?: string) {
  const value = pathOrUrl ?? DEFAULT_TEMP_DB_PATH;
  if (value.startsWith("file:")) {
    return `file:${normalizeDbPath(value)}`;
  }

  const absolutePath = path.isAbsolute(value)
    ? value
    : path.resolve(process.cwd(), value);
  return `file:${absolutePath}`;
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
  const allowedRoots = [path.resolve(process.cwd(), "tests", ".tmp") + path.sep];
  const isAllowed = allowedRoots.some((root) => absolute.startsWith(root));
  if (!isAllowed) {
    throw new Error(
      `Test DB path must be under tests/.tmp. Got: ${absolute}.`,
    );
  }
}

export function getTempDbUrl(url?: string) {
  const resolved = url ?? process.env.DATABASE_URL;
  if (!resolved) throw new Error("DATABASE_URL is not set");
  assertSafeTestDbUrl(resolved);
  return resolved;
}

export function ensureLocalTempDbSafety(url?: string) {
  if (process.env.BASE_URL) {
    throw new Error(
      "ensureLocalTempDbSafety: BASE_URL set; should not seed/clear in URL mode.",
    );
  }
  getTempDbUrl(url);
}

export async function withTempE2EDb<T>(
  fn: (db: PrismaClient) => Promise<T> | T,
  opts?: { clearFirst?: boolean },
): Promise<T> {
  if (!process.env.DATABASE_URL) {
    const metaFile = path.join(
      process.cwd(),
      "tests",
      ".tmp",
      "e2e-db-path.txt",
    );
    try {
      const dbPath = fs.readFileSync(metaFile, "utf8").trim();
      if (dbPath) {
        const absolutePath = path.isAbsolute(dbPath)
          ? dbPath
          : path.resolve(process.cwd(), dbPath);
        process.env.DATABASE_URL = `file:${absolutePath}`;
      }
    } catch {}
  }

  ensureLocalTempDbSafety();

  const safeUrl = getTempDbUrl();
  const db = new PrismaClient({
    adapter: new PrismaLibSql(
      { url: safeUrl },
      { timestampFormat: "unixepoch-ms" },
    ),
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
      await db.cultivarReference.deleteMany();
      await db.ahsListing.deleteMany();
      await db.keyValue.deleteMany();
      await db.user.deleteMany();
    }
    return await fn(db);
  } finally {
    await db.$disconnect();
  }
}
