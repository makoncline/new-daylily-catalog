import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { vi } from "vitest";
import { createTRPCProxyClient, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "@/server/api/root";
import type { createTRPCContext } from "@/server/api/trpc";

const TMP_DIR = path.join(process.cwd(), "tests", ".tmp");

function prismaBinPath() {
  const bin = process.platform === "win32" ? "prisma.cmd" : "prisma";
  return path.join(process.cwd(), "node_modules", ".bin", bin);
}

export function createTempSqliteUrl() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const file = `test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`;
  const filePath = path.join(TMP_DIR, file);
  return { url: `file:${filePath}`, filePath } as const;
}

function assertSafeTestDbUrl(sqliteUrl: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run test DB helpers in production.");
  }
  if (!sqliteUrl.startsWith("file:")) {
    throw new Error(`Test DB URL must start with "file:". Got: ${sqliteUrl}`);
  }

  const p = sqliteUrl.replace(/^file:/, "");
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  const mustBeUnder = path.resolve(process.cwd(), "tests", ".tmp") + path.sep;
  if (!abs.startsWith(mustBeUnder)) {
    throw new Error(
      `Test DB path must be under tests/.tmp. Got: ${abs}. Expected prefix: ${mustBeUnder}`,
    );
  }
  if (/^(postgres|mysql|sqlserver|mongodb|libsql):/i.test(sqliteUrl)) {
    throw new Error(`Refusing non-file database URL for tests: ${sqliteUrl}`);
  }
}

export function prismaDbPush(sqliteUrl: string) {
  assertSafeTestDbUrl(sqliteUrl);

  const rustLog = process.env.RUST_LOG;
  const effectiveRustLog =
    rustLog === "warn" || rustLog === "error" || rustLog === "off"
      ? "info"
      : (rustLog ?? "info");

  const res = spawnSync(prismaBinPath(), ["db", "push", "--skip-generate"], {
    env: {
      ...process.env,
      NODE_OPTIONS: "",
      RUST_LOG: effectiveRustLog,
      LOCAL_DATABASE_URL: sqliteUrl,
    },
    cwd: process.cwd(),
    stdio: "pipe",
  });
  if (res.status !== 0) {
    const stderr = res.stderr ? res.stderr.toString() : "";
    throw new Error(`Failed to run "prisma db push": ${stderr}`);
  }
}

type AnyCaller = Record<string, unknown>;
type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

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

          Promise.resolve(fn(op.input))
            .then((data: unknown) => {
              emit.next(
                { result: { data } } as unknown as Parameters<typeof emit.next>[0],
              );
              emit.complete();
            })
            .catch((err: unknown) =>
              emit.error(err as Parameters<typeof emit.error>[0]),
            );

          // eslint-disable-next-line @typescript-eslint/no-empty-function
          return () => {};
        } catch (err) {
          emit.error(err as Parameters<typeof emit.error>[0]);
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          return () => {};
        }
      });
}

export async function withTempAppDb<T>(
  fn: (ctx: { user: { id: string } }) => Promise<T> | T,
): Promise<T> {
  const envKeys = [
    "USE_TURSO_DB",
    "LOCAL_DATABASE_URL",
    "SKIP_ENV_VALIDATION",
    "STRIPE_SECRET_KEY",
  ] as const;
  const prevEnv = Object.fromEntries(
    envKeys.map((key) => [key, process.env[key]]),
  );

  const { url, filePath } = createTempSqliteUrl();
  prismaDbPush(url);

  process.env.USE_TURSO_DB = "false";
  process.env.LOCAL_DATABASE_URL = url;
  process.env.SKIP_ENV_VALIDATION = "1";
  process.env.STRIPE_SECRET_KEY ??= "sk_test_unit";

  try {
    // Ensure the prisma singleton is recreated for this DB
    (globalThis as unknown as { prisma?: unknown }).prisma = undefined;
  } catch {
    // ignore
  }

  vi.resetModules();

  try {
    const { db } = await import("@/server/db");
    const user = await db.user.create({ data: {} });

    const { createCaller } = await import("@/server/api/root");
    const caller = createCaller(async () => {
      return {
        db,
        headers: new Headers(),
        user: { id: user.id } as unknown as TRPCContext["user"],
      } satisfies TRPCContext;
    });

    const clientLike = createTRPCProxyClient<AppRouter>({
      links: [callerLink(caller)],
    });

    const { setTestTrpcClient } = await import("@/trpc/client");
    setTestTrpcClient(clientLike);

    return await fn({ user: { id: user.id } });
  } finally {
    try {
      const { clearTestTrpcClient } = await import("@/trpc/client");
      clearTestTrpcClient();
    } catch {
      // ignore
    }

    try {
      const { db } = await import("@/server/db");
      await db.$disconnect();
    } catch {
      // ignore
    }

    try {
      (globalThis as unknown as { prisma?: unknown }).prisma = undefined;
    } catch {
      // ignore
    }

    try {
      fs.unlinkSync(path.resolve(filePath));
    } catch {
      // ignore
    }

    for (const key of envKeys) {
      const value = prevEnv[key];
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
