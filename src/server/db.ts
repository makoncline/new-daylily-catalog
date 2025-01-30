import { PrismaClient } from "../../prisma/generated/sqlite-client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import { env } from "@/env";

// Use Turso if explicitly set or if in production (unless explicitly disabled)
const useTursoDb =
  process.env.USE_TURSO_DB === "true" ||
  (env.NODE_ENV === "production" && process.env.USE_TURSO_DB !== "false");

const databaseUrl = useTursoDb
  ? env.TURSO_DATABASE_URL
  : env.LOCAL_DATABASE_URL;

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
    log: ["query", "error", "warn"],
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
