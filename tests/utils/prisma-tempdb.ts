import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

// Directory where test DB files are stored
const TMP_DIR = path.join(process.cwd(), "tests", ".tmp");

export type SetupResult = {
  db: PrismaClient;
  filePath: string;
  url: string;
};

function prismaBinPath() {
  const bin = process.platform === "win32" ? "prisma.cmd" : "prisma";
  return path.join(process.cwd(), "node_modules", ".bin", bin);
}

export function createTempSqliteUrl() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const file = `test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`;
  const absolutePath = path.join(TMP_DIR, file);
  // Use absolute file path so Prisma does not resolve relative to prisma/schema directory.
  const url = `file:${absolutePath}`;
  return { url, filePath: absolutePath } as const;
}

function assertSafeTestDbUrl(sqliteUrl: string) {
  // Never allow running in production
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to run test DB helpers in production environment.",
    );
  }

  // Must be a file: URL pointing to project-local path
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

  // Extra guard: refuse common remote/production schemes just in case
  if (/^(postgres|mysql|sqlserver|mongodb|libsql):/i.test(sqliteUrl)) {
    throw new Error(`Refusing non-file database URL for tests: ${sqliteUrl}`);
  }
}

export function prismaDbPush(sqliteUrl: string, opts?: { verbose?: boolean }) {
  assertSafeTestDbUrl(sqliteUrl);
  const prismaBin = prismaBinPath();
  const stdio = opts?.verbose ? "inherit" : "pipe";
  const res = spawnSync(prismaBin, ["db", "push", "--skip-generate"], {
    env: { ...process.env, LOCAL_DATABASE_URL: sqliteUrl },
    cwd: process.cwd(),
    stdio,
  });
  if (res.status !== 0) {
    const stderr = res.stderr ? res.stderr.toString() : "";
    throw new Error(`Failed to run \"prisma db push\": ${stderr}`);
  }
}

export async function setupPrismaTestDb(opts?: {
  verbosePush?: boolean;
}): Promise<SetupResult> {
  const { url, filePath } = createTempSqliteUrl();
  prismaDbPush(url, { verbose: opts?.verbosePush });
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ["error"],
  });
  await prisma.$connect();
  return { db: prisma, filePath, url };
}

export async function teardownPrismaTestDb(
  prisma: PrismaClient,
  filePath: string,
) {
  await prisma.$disconnect();
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}

export async function withTempTestDb<T>(
  fn: (ctx: {
    db: PrismaClient;
    filePath: string;
    url: string;
  }) => Promise<T> | T,
  opts?: { verbosePush?: boolean },
): Promise<T> {
  const { db, filePath, url } = await setupPrismaTestDb(opts);
  try {
    return await fn({ db, filePath, url });
  } finally {
    await teardownPrismaTestDb(db, filePath);
  }
}
