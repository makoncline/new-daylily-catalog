import path from "node:path";
import fs from "node:fs";
import { PrismaClient } from "../../../prisma/generated/sqlite-client/index.js";

// Export the Prisma client type for use in e2e helpers/tests
export type E2EPrismaClient = PrismaClient;

function assertSafeTestDbUrl(sqliteUrl: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run e2e DB helpers in production.");
  }
  if (!sqliteUrl.startsWith("file:")) {
    throw new Error(`Test DB URL must start with "file:". Got: ${sqliteUrl}`);
  }
  const p = sqliteUrl.replace(/^file:/, "");
  const absolute = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  const mustBeUnder = path.resolve(process.cwd(), "tests", ".tmp") + path.sep;
  if (!absolute.startsWith(mustBeUnder)) {
    throw new Error(
      `Test DB path must be under tests/.tmp. Got: ${absolute}. Expected prefix: ${mustBeUnder}`,
    );
  }
}

export function ensureLocalTempDbSafety() {
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
  const url = process.env.LOCAL_DATABASE_URL;
  if (!url) throw new Error("LOCAL_DATABASE_URL is not set");
  assertSafeTestDbUrl(url);
}

export async function connectDb() {
  const url = process.env.LOCAL_DATABASE_URL!;
  assertSafeTestDbUrl(url);
  const db = new PrismaClient({ datasources: { db: { url } }, log: ["error"] });
  await db.$connect();
  return db;
}

export async function clearDb() {
  ensureLocalTempDbSafety();
  const db = await connectDb();
  try {
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
  } finally {
    await db.$disconnect();
  }
}

export async function seedBaseData() {
  ensureLocalTempDbSafety();
  const db = await connectDb();
  try {
    // Seed user with id "3" and profile with slug "rollingoaksdaylilies"
    const userId = "3";
    await db.user.create({ data: { id: userId } });
    await db.userProfile.create({
      data: {
        userId,
        title: "RollingOaksDaylilies",
        slug: "rollingoaksdaylilies",
        description: "Seeded profile for E2E",
      },
    });

    // Seed listing with id "221" and slug "coffee-frenzy"
    await db.listing.create({
      data: {
        id: "221",
        userId,
        title: "Coffee Frenzy",
        slug: "coffee-frenzy",
      },
    });
  } finally {
    await db.$disconnect();
  }
}

export async function resetAndSeed() {
  await clearDb();
  await seedBaseData();
}

export async function withTempE2EDb<T>(
  fn: (db: PrismaClient) => Promise<T> | T,
  opts?: { clearFirst?: boolean },
): Promise<T> {
  // If LOCAL_DATABASE_URL is not set, try to read it from the file written by global-setup
  if (!process.env.LOCAL_DATABASE_URL) {
    const metaFile = path.join(process.cwd(), "tests", ".tmp", "e2e-db-path.txt");
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

  if (opts?.clearFirst !== false) {
    await clearDb();
  }

  const db = await connectDb();
  try {
    return await fn(db);
  } finally {
    await db.$disconnect();
  }
}
