import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import {
  env,
  isFileDatabaseUrl,
  isLibsqlDatabaseUrl,
  requireEnv,
} from "@/env";
import { type Prisma } from "@prisma/client";
import { attachLocalQueryProfiler } from "@/server/db/local-query-profiler";

const databaseUrl = requireEnv("DATABASE_URL", env.DATABASE_URL);

function getLocalSqliteLogConfig() {
  const baseLogs: Array<Prisma.LogLevel | Prisma.LogDefinition> = [
    { level: "error", emit: "stdout" },
    { level: "warn", emit: "stdout" },
  ];

  if (process.env.LOCAL_QUERY_PROFILER === "1") {
    baseLogs.push({ level: "query", emit: "event" });
    return baseLogs;
  }

  if (env.NODE_ENV === "development") {
    baseLogs.push({ level: "query", emit: "stdout" });
  }

  return baseLogs;
}

const createPrismaClient = () => {
  if (isFileDatabaseUrl(databaseUrl)) {
    const adapter = new PrismaBetterSqlite3(
      { url: databaseUrl },
      {
        timestampFormat: "unixepoch-ms",
      },
    );

    return attachLocalQueryProfiler(
      new PrismaClient({
        adapter,
        log: getLocalSqliteLogConfig(),
      }),
      { databaseUrl },
    );
  }

  if (!isLibsqlDatabaseUrl(databaseUrl)) {
    throw new Error(`Unsupported DATABASE_URL: ${databaseUrl}`);
  }

  const adapter = new PrismaLibSql(
    {
      url: databaseUrl,
      authToken: env.TURSO_DATABASE_AUTH_TOKEN,
    },
    {
      // Existing SQLite/Turso data was written with Prisma's legacy unixepoch format.
      timestampFormat: "unixepoch-ms",
    },
  );

  return attachLocalQueryProfiler(
    new PrismaClient({
      adapter,
      log: ["error"],
    }),
    { databaseUrl },
  );
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
