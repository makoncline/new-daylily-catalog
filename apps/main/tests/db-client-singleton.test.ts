// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface LibSqlConfigSnapshot {
  authToken?: string;
  syncInterval?: number;
  syncUrl?: string;
  url?: string;
}

const mocks = vi.hoisted(() => ({
  betterSqliteConfigs: [] as unknown[],
  libSqlConfigs: [] as LibSqlConfigSnapshot[],
  prismaClientCount: 0,
  prismaClientOptions: [] as unknown[],
}));

function clearGlobalPrismaClients() {
  const globalForPrisma = globalThis as typeof globalThis & {
    prisma?: unknown;
    replicaPrisma?: unknown;
  };

  delete globalForPrisma.prisma;
  delete globalForPrisma.replicaPrisma;
}

vi.mock("@/env", () => ({
  env: {
    DATABASE_URL: "libsql://primary-db",
    NODE_ENV: "production",
    TURSO_DATABASE_AUTH_TOKEN: "test-token",
    TURSO_EMBEDDED_REPLICA_SYNC_INTERVAL_SECONDS: "600",
    TURSO_EMBEDDED_REPLICA_URL: "file:/tmp/daylily-replica.db",
  },
  isFileDatabaseUrl: (value: string) => value.startsWith("file:"),
  isLibsqlDatabaseUrl: (value: string) => value.startsWith("libsql://"),
  requireEnv: <T>(name: string, value: T | null | undefined): T => {
    if (!value) {
      throw new Error(`${name} is required.`);
    }

    return value;
  },
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: class MockPrismaClient {
    readonly id: number;

    constructor(options: unknown) {
      mocks.prismaClientCount += 1;
      this.id = mocks.prismaClientCount;
      mocks.prismaClientOptions.push(options);
    }
  },
}));

vi.mock("@prisma/adapter-better-sqlite3", () => ({
  PrismaBetterSqlite3: class MockPrismaBetterSqlite3 {
    constructor(config: unknown) {
      mocks.betterSqliteConfigs.push(config);
    }
  },
}));

vi.mock("@prisma/adapter-libsql", () => ({
  PrismaLibSql: class MockPrismaLibSql {
    constructor(config: LibSqlConfigSnapshot) {
      mocks.libSqlConfigs.push({ ...config });
    }
  },
}));

vi.mock("@/server/db/local-query-profiler", () => ({
  attachLocalQueryProfiler: <T>(client: T): T => client,
}));

describe("server db clients", () => {
  beforeEach(() => {
    clearGlobalPrismaClients();
    mocks.betterSqliteConfigs.length = 0;
    mocks.libSqlConfigs.length = 0;
    mocks.prismaClientCount = 0;
    mocks.prismaClientOptions.length = 0;
    vi.resetModules();
  });

  afterEach(() => {
    clearGlobalPrismaClients();
    vi.resetModules();
  });

  it("reuses production clients across module reloads to avoid duplicate replica sync loops", async () => {
    const firstImport = await import("@/server/db");
    const firstDb = firstImport.db;
    const firstReplicaDb = firstImport.replicaDb;

    vi.resetModules();

    const secondImport = await import("@/server/db");

    expect(secondImport.db).toBe(firstDb);
    expect(secondImport.replicaDb).toBe(firstReplicaDb);
    expect(mocks.prismaClientOptions).toHaveLength(2);
    expect(mocks.libSqlConfigs).toEqual([
      {
        authToken: "test-token",
        url: "libsql://primary-db",
      },
      {
        authToken: "test-token",
        syncInterval: 600,
        syncUrl: "libsql://primary-db",
        url: "file:/tmp/daylily-replica.db",
      },
    ]);
  });
});
