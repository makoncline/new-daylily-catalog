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
  env: {
    DATABASE_URL: "libsql://primary-db",
    NODE_ENV: "production",
    TURSO_DATABASE_AUTH_TOKEN: "test-token",
    TURSO_EMBEDDED_REPLICA_SYNC_INTERVAL_SECONDS: "600",
    TURSO_EMBEDDED_REPLICA_URL: "file:/tmp/daylily-replica.db" as
      | string
      | undefined,
  },
  libSqlClientConfigs: [] as LibSqlConfigSnapshot[],
  libSqlClientSync: vi.fn(),
  libSqlConfigs: [] as LibSqlConfigSnapshot[],
  prismaClientCount: 0,
  prismaClientOptions: [] as unknown[],
  syncResult: { frameNo: "12", framesSynced: 3 },
}));

function clearGlobalPrismaClients() {
  const globalForPrisma = globalThis as typeof globalThis & {
    prisma?: unknown;
    replicaLibSqlClient?: unknown;
    replicaPrisma?: unknown;
  };

  delete globalForPrisma.prisma;
  delete globalForPrisma.replicaLibSqlClient;
  delete globalForPrisma.replicaPrisma;
}

vi.mock("@/env", () => ({
  env: mocks.env,
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
    private connected = false;
    private readonly options: {
      adapter?: { connect: () => Promise<unknown> };
    };

    constructor(options: { adapter?: { connect: () => Promise<unknown> } }) {
      mocks.prismaClientCount += 1;
      this.id = mocks.prismaClientCount;
      this.options = options;
      mocks.prismaClientOptions.push(options);
    }

    async $connect() {
      if (this.connected) return;

      await this.options.adapter?.connect();
      this.connected = true;
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
    private readonly config: LibSqlConfigSnapshot;

    constructor(config: LibSqlConfigSnapshot) {
      this.config = config;
      mocks.libSqlConfigs.push({ ...config });
    }

    createClient(config: LibSqlConfigSnapshot) {
      mocks.libSqlClientConfigs.push({ ...config });
      return { sync: mocks.libSqlClientSync };
    }

    async connect() {
      return this.createClient(this.config);
    }
  },
}));

vi.mock("@/server/db/local-query-profiler", () => ({
  attachLocalQueryProfiler: <T>(client: T): T => client,
}));

describe("server db clients", () => {
  beforeEach(() => {
    clearGlobalPrismaClients();
    mocks.env.NODE_ENV = "production";
    mocks.env.TURSO_EMBEDDED_REPLICA_URL = "file:/tmp/daylily-replica.db";
    mocks.betterSqliteConfigs.length = 0;
    mocks.libSqlClientConfigs.length = 0;
    mocks.libSqlClientSync.mockReset();
    mocks.libSqlClientSync.mockResolvedValue(mocks.syncResult);
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
    await firstReplicaDb.$connect();

    vi.resetModules();

    const secondImport = await import("@/server/db");
    const syncedReplicaDb = await secondImport.syncEmbeddedReplica();

    expect(secondImport.db).toBe(firstDb);
    expect(secondImport.replicaDb).toBe(firstReplicaDb);
    expect(syncedReplicaDb).toBe(firstReplicaDb);
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
    expect(mocks.libSqlClientConfigs).toEqual([
      {
        authToken: "test-token",
        syncInterval: 600,
        syncUrl: "libsql://primary-db",
        url: "file:/tmp/daylily-replica.db",
      },
    ]);
    expect(mocks.libSqlClientSync).toHaveBeenCalledOnce();
  });

  it("returns the local database without syncing outside production", async () => {
    mocks.env.NODE_ENV = "development";
    mocks.env.TURSO_EMBEDDED_REPLICA_URL = undefined;

    const { db, replicaDb, syncEmbeddedReplica } = await import("@/server/db");

    expect(replicaDb).toBe(db);
    await expect(syncEmbeddedReplica()).resolves.toBe(db);
    expect(mocks.libSqlClientConfigs).toEqual([]);
    expect(mocks.libSqlClientSync).not.toHaveBeenCalled();
  });

  it("does not fall back to the remote primary in production", async () => {
    mocks.env.TURSO_EMBEDDED_REPLICA_URL = undefined;

    const { syncEmbeddedReplica } = await import("@/server/db");

    await expect(syncEmbeddedReplica()).rejects.toThrow(
      "Embedded Turso replica is required in production.",
    );
    expect(mocks.libSqlClientConfigs).toEqual([]);
    expect(mocks.libSqlClientSync).not.toHaveBeenCalled();
  });
});
