import { PrismaClient } from "../../prisma/generated/sqlite-client/index.js";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import { env } from "@/env";
import { type Prisma } from "../../prisma/generated/sqlite-client/index.js";
import { attachLocalQueryProfiler } from "@/server/db/local-query-profiler";

// Use Turso if explicitly set or if in production (unless explicitly disabled)
const useTursoDb =
  process.env.USE_TURSO_DB === "true" ||
  (env.NODE_ENV === "production" && process.env.USE_TURSO_DB !== "false");

const databaseUrl = useTursoDb
  ? env.TURSO_DATABASE_URL
  : env.LOCAL_DATABASE_URL;

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
  if (useTursoDb) {
    const libsql = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_DATABASE_AUTH_TOKEN,
    });

    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({
      adapter,
      log: ["error"],
    });
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl, // Uses local SQLite path
      },
    },
    log: getLocalSqliteLogConfig(),
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

attachLocalQueryProfiler(db, { useTursoDb, databaseUrl });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
