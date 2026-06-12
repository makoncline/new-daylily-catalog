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
const cultivarReadDatabaseUrl = env.CULTIVAR_READ_DATABASE_URL;

function getCultivarReadSyncUrl() {
  if (env.CULTIVAR_READ_SYNC_URL) return env.CULTIVAR_READ_SYNC_URL;
  if (isLibsqlDatabaseUrl(databaseUrl)) return databaseUrl;
  return undefined;
}

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

const createPrismaClient = (url: string) => {
  if (isFileDatabaseUrl(url)) {
    const adapter = new PrismaBetterSqlite3(
      { url },
      {
        timestampFormat: "unixepoch-ms",
      },
    );

    return attachLocalQueryProfiler(
      new PrismaClient({
        adapter,
        log: getLocalSqliteLogConfig(),
      }),
      { databaseUrl: url },
    );
  }

  if (!isLibsqlDatabaseUrl(url)) {
    throw new Error(`Unsupported DATABASE_URL: ${url}`);
  }

  const adapter = new PrismaLibSql(
    {
      url,
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
    { databaseUrl: url },
  );
};

const createEmbeddedReplicaPrismaClient = (url: string, syncUrl?: string) => {
  const adapter = new PrismaLibSql(
    {
      url,
      authToken: env.TURSO_DATABASE_AUTH_TOKEN,
      syncUrl,
      syncInterval: env.CULTIVAR_READ_SYNC_INTERVAL_SECONDS,
    },
    {
      // Existing SQLite/Turso data was written with Prisma's legacy unixepoch format.
      timestampFormat: "unixepoch-ms",
    },
  );

  return attachLocalQueryProfiler(
    new PrismaClient({
      adapter,
      log: isFileDatabaseUrl(url) ? getLocalSqliteLogConfig() : ["error"],
    }),
    { databaseUrl: url },
  );
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  cultivarReadPrisma:
    | ReturnType<typeof createEmbeddedReplicaPrismaClient>
    | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient(databaseUrl);

export const cultivarReadDb =
  globalForPrisma.cultivarReadPrisma ??
  (cultivarReadDatabaseUrl
    ? createEmbeddedReplicaPrismaClient(
        cultivarReadDatabaseUrl,
        getCultivarReadSyncUrl(),
      )
    : db);

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.cultivarReadPrisma = cultivarReadDb;
}
