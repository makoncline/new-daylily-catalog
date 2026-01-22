// src/lib/test-utils/app-test-db.ts
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { vi } from "vitest";
import { createTRPCProxyClient, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "@/server/api/root";

const TMP_DIR = path.join(process.cwd(), "tests", ".tmp");

export type TempAppDbOptions = {
  verbosePush?: boolean;
  /** Keep the SQLite file on disk after the test (useful for debugging). */
  keepFile?: boolean;
};

/* ───────────────────────────── Prisma temp DB ───────────────────────────── */

function prismaBinPath() {
  const bin = process.platform === "win32" ? "prisma.cmd" : "prisma";
  return path.join(process.cwd(), "node_modules", ".bin", bin);
}

export function createTempSqliteUrl() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const file = `test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`;
  const absolutePath = path.join(TMP_DIR, file);
  // Absolute path so Prisma doesn't resolve it relative to prisma/schema
  const url = `file:${absolutePath}`;
  return { url, filePath: absolutePath } as const;
}

function assertSafeTestDbUrl(sqliteUrl: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run test DB helpers in production.");
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
    throw new Error(`Failed to run "prisma db push": ${stderr}`);
  }
}

export async function setupPrismaTestDb(opts?: {
  verbosePush?: boolean;
}): Promise<{ db: PrismaClient; filePath: string; url: string }> {
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
  keepFile = false,
) {
  await prisma.$disconnect();
  if (!keepFile) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore
    }
  }
}

export async function withTempTestDb<T>(
  fn: (ctx: {
    db: PrismaClient;
    filePath: string;
    url: string;
  }) => Promise<T> | T,
  opts?: { verbosePush?: boolean; keepFile?: boolean },
): Promise<T> {
  const { db, filePath, url } = await setupPrismaTestDb(opts);
  try {
    return await fn({ db, filePath, url });
  } finally {
    await teardownPrismaTestDb(db, filePath, !!opts?.keepFile);
  }
}

/* ───────────────────────────── tRPC caller link ─────────────────────────── */

type AnyCaller = Record<string, unknown>;

/**
 * A tRPC client link that routes ops into an in-process caller.
 * Works with queries, mutations, and (optionally) subscriptions.
 */

export function callerLink(caller: AnyCaller): TRPCLink<AppRouter> {
  return () =>
    ({ op }) =>
      observable((emit) => {
        try {
          const fn = op.path
            .split(".")
            .reduce(
              (obj: AnyCaller | undefined, key) => obj?.[key] as AnyCaller,
              caller,
            ) as unknown as (...args: unknown[]) => unknown;
          if (typeof fn !== "function") {
            throw new Error(
              `tRPC callerLink: "${op.path}" did not resolve to a function`,
            );
          }

          if (op.type === "subscription") {
            const sub = fn(op.input, {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onData: (data: unknown) => emit.next({ result: { data } } as any),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onError: (err: unknown) => emit.error(err as any),
              onComplete: () => emit.complete(),
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return () => (sub as any)?.unsubscribe?.();
          }

          Promise.resolve(fn(op.input))
            .then((data: unknown) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              emit.next({ result: { data } } as any);
              emit.complete();
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .catch((err: unknown) => emit.error(err as any));

          // eslint-disable-next-line @typescript-eslint/no-empty-function
          return () => {};
        } catch (err) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          emit.error(err as any);
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          return () => {};
        }
      });
}

/* ────────────────────── Full app boot: per-test DB + client ─────────────── */

export async function withTempAppDb<T>(
  fn: (ctx: {
    url: string;
    filePath: string;
    user: { id: string };
  }) => Promise<T> | T,
  opts?: TempAppDbOptions,
): Promise<T> {
  const { url, filePath } = createTempSqliteUrl();

  // Prepare schema into the temp DB
  prismaDbPush(url, { verbose: opts?.verbosePush });

  // Force app to use local SQLite and skip strict env validation
  process.env.USE_TURSO_DB = "false";
  process.env.LOCAL_DATABASE_URL = url;
  process.env.SKIP_ENV_VALIDATION = "1";

  // Ensure all modules re-evaluate with the new env and new DB URL
  try {
    (globalThis as Record<string, unknown>).prisma = undefined;
  } catch {}
  vi.resetModules();

  try {
    // Import fresh db client bound to the temp DB
    const { db } = await import("@/server/db");
    // Create a default user for protected procedures
    const user = await db.user.create({ data: {} });

    // Build in-process tRPC caller and route the app client to it
    const { createCaller } = await import("@/server/api/root");
    const caller = createCaller({
      db,
      user: { id: user.id },
      headers: new Headers(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const clientLike = createTRPCProxyClient<AppRouter>({
      links: [callerLink(caller)],
    });

    const { setTestTrpcClient } = await import("@/trpc/client");
    setTestTrpcClient(clientLike);

    return await fn({ url, filePath, user: { id: user.id } });
  } finally {
    try {
      // Disconnect prisma if it was imported
      const mod = await import("@/server/db");
      const pdb = (mod as { db?: { $disconnect: () => Promise<void> } }).db;
      if (pdb && typeof pdb.$disconnect === "function") {
        await pdb.$disconnect();
      }
    } catch {
      // ignore
    }
    // Clear any test TRPC client override
    try {
      const trpc = await import("@/trpc/client");
      if (typeof trpc.clearTestTrpcClient === "function") {
        trpc.clearTestTrpcClient();
      }
    } catch {
      // ignore
    }
    // Clear the global prisma cache to avoid reusing a disconnected client
    try {
      (globalThis as Record<string, unknown>).prisma = undefined;
    } catch {}
    // Remove the temp DB unless kept for debugging
    if (!opts?.keepFile) {
      try {
        fs.unlinkSync(path.resolve(filePath));
      } catch {
        // ignore
      }
    }
  }
}
