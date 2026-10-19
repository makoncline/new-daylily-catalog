import "server-only";

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import {
  type Client as LibSqlClient,
  type Config as LibSqlConfig,
} from "@libsql/client";
import { env, isFileDatabaseUrl, isLibsqlDatabaseUrl, requireEnv } from "@/env";
import { type Prisma } from "@prisma/client";
import { attachLocalQueryProfiler } from "@/server/db/local-query-profiler";

const databaseUrl = requireEnv("DATABASE_URL", env.DATABASE_URL);
const embeddedReplicaUrl = getEmbeddedReplicaUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  replicaLibSqlClient: LibSqlClient | undefined;
  replicaPrisma: PrismaClient | undefined;
};

class AppPrismaLibSql extends PrismaLibSql {
  override createClient(config: LibSqlConfig): LibSqlClient {
    const client = super.createClient(config);

    if (config.url === embeddedReplicaUrl) {
      globalForPrisma.replicaLibSqlClient = client;
    }

    return client;
  }
}

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

  if (env.NODE_ENV === "development") {
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
  const adapter = new AppPrismaLibSql(libsqlConfig, {
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

export const db = globalForPrisma.prisma ?? createPrismaClient();
export const replicaDb =
  globalForPrisma.replicaPrisma ?? createReplicaPrismaClient();
export const hasEmbeddedReplica = Boolean(embeddedReplicaUrl);
export const hasLocalPublicReadDb =
  isFileDatabaseUrl(databaseUrl) || hasEmbeddedReplica;

// Vercel's existing seeded fixture has no persistent replica. Never permit this
// exception for a production deployment or a production database URL.
const hasSeededVercelReadDb =
  process.env.VERCEL === "1" &&
  ["preview", "development"].includes(process.env.VERCEL_ENV ?? "") &&
  /^libsql:\/\/seeded-daylily-catalog-[a-z0-9-]+(?:\.aws-[a-z0-9-]+)?\.turso\.io\/?$/i.test(
    databaseUrl,
  );
export const hasPublicReadDb = hasLocalPublicReadDb || hasSeededVercelReadDb;

export const publicDb: typeof db = hasPublicReadDb
  ? replicaDb
  : new Proxy({} as typeof db, {
      get() {
        throw new Error(
          "Public database reads require local SQLite or an embedded replica.",
        );
      },
    });

/**
 * Sync the normal embedded replica and return the exact Prisma singleton that
 * owns that libSQL client. Production producers must not fall back to Turso.
 */
export async function syncEmbeddedReplica() {
  if (!embeddedReplicaUrl) {
    if (env.NODE_ENV === "production") {
      throw new Error("Embedded Turso replica is required in production.");
    }

    return replicaDb;
  }

  await replicaDb.$connect();

  const replicaLibSqlClient = globalForPrisma.replicaLibSqlClient;
  if (!replicaLibSqlClient) {
    throw new Error("Embedded replica libSQL client was not created.");
  }

  await replicaLibSqlClient.sync();
  return replicaDb;
}

globalForPrisma.prisma = db;
globalForPrisma.replicaPrisma = replicaDb;
