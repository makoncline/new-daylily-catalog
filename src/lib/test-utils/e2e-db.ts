import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "../../../prisma/generated/sqlite-client/index.js";

const TMP_DIR = path.join(process.cwd(), "tests", ".tmp");

export function createTempSqliteUrl() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const file = `pw-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`;
  const absolutePath = path.join(TMP_DIR, file);
  const url = `file:${absolutePath}`;
  return { url, filePath: absolutePath } as const;
}

function prismaBinPath() {
  const bin = process.platform === "win32" ? "prisma.cmd" : "prisma";
  return path.join(process.cwd(), "node_modules", ".bin", bin);
}

export function assertSafeTestDbUrl(sqliteUrl: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run e2e DB helpers in production.");
  }
  if (!sqliteUrl.startsWith("file:")) {
    throw new Error(`Test DB URL must start with \"file:\". Got: ${sqliteUrl}`);
  }
  const p = sqliteUrl.replace(/^file:/, "");
  const absolute = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  const mustBeUnder = path.resolve(process.cwd(), "tests", ".tmp") + path.sep;
  if (!absolute.startsWith(mustBeUnder)) {
    throw new Error(
      `Test DB path must be under tests/.tmp. Got: ${absolute}. Expected prefix: ${mustBeUnder}`,
    );
  }
  if (/^(postgres|mysql|sqlserver|mongodb|libsql):/i.test(sqliteUrl)) {
    throw new Error(`Refusing non-file database URL for tests: ${sqliteUrl}`);
  }
}

export function prismaDbPush(sqliteUrl: string) {
  assertSafeTestDbUrl(sqliteUrl);
  const prismaBin = prismaBinPath();
  const res = spawnSync(prismaBin, ["db", "push", "--skip-generate"], {
    env: { ...process.env, LOCAL_DATABASE_URL: sqliteUrl },
    cwd: process.cwd(),
    stdio: "inherit",
  });
  if (res.status !== 0) {
    throw new Error(`Failed to run \"prisma db push\"`);
  }
}

export function prepareDbFromTemplate(
  destFilePath: string,
  templatePath?: string,
) {
  const template =
    templatePath ?? path.join(process.cwd(), "prisma", "db-dev.sqlite");
  if (!fs.existsSync(template)) {
    throw new Error(
      `Template DB not found at ${template}. Build one by running the app once or provide a templatePath.`,
    );
  }
  // Ensure destination directory exists
  fs.mkdirSync(path.dirname(destFilePath), { recursive: true });
  fs.copyFileSync(template, destFilePath);
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
    await db.list.deleteMany();
    await db.listing.deleteMany();
    await db.userProfile.deleteMany();
    await db.ahsListing.deleteMany();
    await db.keyValue.deleteMany();
    // Clear join table if present (Prisma doesn't expose it as a model)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).$executeRawUnsafe('DELETE FROM "_ListToListing"');
    } catch {}
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
        title: "Coffee Frenzy Daylily",
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
): Promise<T | undefined> {
  // Execute only in local temp DB mode; otherwise no-op for URL/attached runs
  try {
    ensureLocalTempDbSafety();
  } catch {
    return undefined;
  }

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
