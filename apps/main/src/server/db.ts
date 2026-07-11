import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { type Config as LibSqlConfig } from "@libsql/client";
import { env, isFileDatabaseUrl, isLibsqlDatabaseUrl, requireEnv } from "@/env";
import { type Prisma } from "@prisma/client";
import { attachLocalQueryProfiler } from "@/server/db/local-query-profiler";

const databaseUrl = requireEnv("DATABASE_URL", env.DATABASE_URL);
const embeddedReplicaUrl = getEmbeddedReplicaUrl();

function getReplicaSyncIntervalSeconds(): number | undefined {
  if (!env.TURSO_EMBEDDED_REPLICA_SYNC_INTERVAL_SECONDS) return undefined;

  const syncIntervalSeconds = Number(
    env.TURSO_EMBEDDED_REPLICA_SYNC_INTERVAL_SECONDS,
  );

  if (!Number.isInteger(syncIntervalSeconds) || syncIntervalSeconds < 1) {
    throw new Error(
      "TURSO_EMBEDDED_REPLICA_SYNC_INTERVAL_SECONDS must be a positive integer.",
    );
  }

  return syncIntervalSeconds;
}

function getEmbeddedReplicaUrl(): string | undefined {
  const embeddedReplicaUrl = env.TURSO_EMBEDDED_REPLICA_URL;

  if (!embeddedReplicaUrl) return undefined;

  if (!isLibsqlDatabaseUrl(databaseUrl)) {
    throw new Error(
      "TURSO_EMBEDDED_REPLICA_URL requires DATABASE_URL to be a libsql:// Turso URL.",
    );
  }

  if (!isFileDatabaseUrl(embeddedReplicaUrl)) {
    throw new Error("TURSO_EMBEDDED_REPLICA_URL must start with file:.");
  }

  return embeddedReplicaUrl;
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

  if (
    env.NODE_ENV === "development" &&
    process.env.LOCAL_QUERY_LOGGING !== "0"
  ) {
    baseLogs.push({ level: "query", emit: "stdout" });
  }

  return baseLogs;
}

function createFilePrismaClient() {
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

function createLibSqlPrismaClient(libsqlConfig: LibSqlConfig) {
  const adapter = new PrismaLibSql(libsqlConfig, {
    // Existing SQLite/Turso data was written with Prisma's legacy unixepoch format.
    timestampFormat: "unixepoch-ms",
  });

  return attachLocalQueryProfiler(
    new PrismaClient({
      adapter,
      log: ["error"],
    }),
    { databaseUrl: libsqlConfig.url },
  );
}

const createPrismaClient = () => {
  if (isFileDatabaseUrl(databaseUrl)) {
    return createFilePrismaClient();
  }

  if (!isLibsqlDatabaseUrl(databaseUrl)) {
    throw new Error(`Unsupported DATABASE_URL: ${databaseUrl}`);
  }

  return createLibSqlPrismaClient({
    url: databaseUrl,
    authToken: env.TURSO_DATABASE_AUTH_TOKEN,
  });
};

const createReplicaPrismaClient = () => {
  if (!embeddedReplicaUrl) return db;

  if (!isLibsqlDatabaseUrl(databaseUrl)) {
    throw new Error(`Unsupported DATABASE_URL: ${databaseUrl}`);
  }

  return createLibSqlPrismaClient({
    url: embeddedReplicaUrl,
    syncUrl: databaseUrl,
    syncInterval: getReplicaSyncIntervalSeconds(),
    authToken: env.TURSO_DATABASE_AUTH_TOKEN,
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  replicaPrisma: ReturnType<typeof createReplicaPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();
export const replicaDb =
  globalForPrisma.replicaPrisma ?? createReplicaPrismaClient();
export const hasEmbeddedReplica = Boolean(embeddedReplicaUrl);

globalForPrisma.prisma = db;
globalForPrisma.replicaPrisma = replicaDb;
