// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface LibSqlClientConfigSnapshot {
  authToken?: string;
  syncUrl?: string;
  url: string;
}

interface MockFileHandle {
  close: () => Promise<void>;
  writeFile: (data: string, encoding: BufferEncoding) => Promise<void>;
}

interface MockExecFileResult {
  stderr: string;
  stdout: string;
}

const mocks = vi.hoisted(() => {
  const execFilePromisified =
    vi.fn<
      (
        file: string,
        args?: readonly string[],
        options?: unknown,
      ) => Promise<MockExecFileResult>
    >();
  const execFile = vi.fn();
  const promisifyCustom = Symbol.for("nodejs.util.promisify.custom");
  Object.defineProperty(execFile, promisifyCustom, {
    value: execFilePromisified,
  });

  return {
    closeStatusClient: vi.fn(),
    createClient: vi.fn(),
    createClientConfigs: [] as LibSqlClientConfigSnapshot[],
    indexBuiltAt: new Date().toISOString(),
    execFile,
    execFilePromisified,
    indexExists: false,
    lockClose: vi.fn(),
    lockWriteFile: vi.fn(),
    mkdir: vi.fn(),
    open: vi.fn(),
    rename: vi.fn<(oldPath: string, newPath: string) => Promise<void>>(),
    rm: vi.fn(),
    stat: vi.fn(),
    statusExecute: vi.fn(),
    syncWorker: vi.fn<() => Promise<MockExecFileResult>>(),
    unlink: vi.fn(),
  };
});

const mockEnv = vi.hoisted(() => ({
  PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS: undefined as string | undefined,
  TURSO_EMBEDDED_REPLICA_URL: "file:/data/turso-replica.db" as
    | string
    | undefined,
}));

function missingFileError(path: string) {
  const error = new Error(`ENOENT: no such file or directory, stat '${path}'`);
  Object.assign(error, { code: "ENOENT" });
  return error;
}

vi.mock("server-only", () => ({}));

vi.mock("@/env", () => ({
  env: {
    DATABASE_URL: "libsql://primary-db",
    NODE_ENV: "production",
    get PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS() {
      return mockEnv.PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS;
    },
    TURSO_DATABASE_AUTH_TOKEN: "test-token",
    get TURSO_EMBEDDED_REPLICA_URL() {
      return mockEnv.TURSO_EMBEDDED_REPLICA_URL;
    },
  },
  isLibsqlDatabaseUrl: (value: string) => value.startsWith("libsql://"),
}));

vi.mock("node:child_process", () => ({
  execFile: mocks.execFile,
}));

vi.mock("node:fs/promises", () => ({
  mkdir: mocks.mkdir,
  open: mocks.open,
  rename: mocks.rename,
  rm: mocks.rm,
  stat: mocks.stat,
  unlink: mocks.unlink,
}));

vi.mock("@libsql/client", () => ({
  createClient: mocks.createClient,
}));

describe("public search index refresh", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    mockEnv.PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS = undefined;
    mockEnv.TURSO_EMBEDDED_REPLICA_URL = "file:/data/turso-replica.db";

    mocks.closeStatusClient.mockReset();
    mocks.createClient.mockReset();
    mocks.createClientConfigs.length = 0;
    mocks.execFilePromisified.mockReset();
    mocks.indexBuiltAt = new Date().toISOString();
    mocks.indexExists = false;
    mocks.lockClose.mockReset();
    mocks.lockWriteFile.mockReset();
    mocks.mkdir.mockReset();
    mocks.open.mockReset();
    mocks.rename.mockReset();
    mocks.rm.mockReset();
    mocks.stat.mockReset();
    mocks.statusExecute.mockReset();
    mocks.syncWorker.mockReset();
    mocks.unlink.mockReset();

    mocks.mkdir.mockResolvedValue(undefined);
    mocks.open.mockResolvedValue({
      close: mocks.lockClose,
      writeFile: mocks.lockWriteFile,
    } satisfies MockFileHandle);
    mocks.lockClose.mockResolvedValue(undefined);
    mocks.lockWriteFile.mockResolvedValue(undefined);
    mocks.rename.mockResolvedValue(undefined);
    mocks.rm.mockResolvedValue(undefined);
    mocks.unlink.mockResolvedValue(undefined);

    mocks.stat.mockImplementation(async (filePath: string) => {
      if (filePath === "/data/search/public-search.sqlite") {
        if (!mocks.indexExists) {
          throw missingFileError(filePath);
        }

        return { mtimeMs: Date.now() };
      }

      if (filePath === "/data/search/public-search.sqlite.refresh.lock") {
        throw missingFileError(filePath);
      }

      return { mtimeMs: Date.now() };
    });

    mocks.syncWorker.mockResolvedValue({
      stderr: "",
      stdout: JSON.stringify({
        ok: true,
        durationMs: 20,
        frameNumber: 123,
        framesSynced: 2,
        pid: 456,
      }),
    });

    mocks.execFilePromisified.mockImplementation(
      async (file: string, args?: readonly string[]) => {
        if (file === "sqlite3") {
          return { stderr: "", stdout: "ok\n" };
        }

        if (args?.[0]?.endsWith("sync-public-search-source-replica.mjs")) {
          return mocks.syncWorker();
        }

        mocks.indexExists = true;

        return {
          stderr: "",
          stdout:
            "Source DB: /data/search/public-search-source-replica.sqlite\n",
        };
      },
    );

    mocks.statusExecute.mockImplementation(async (sql: string) => {
      if (sql.includes("SearchIndexMeta")) {
        return {
          rows: [
            { key: "builtAt", value: mocks.indexBuiltAt },
            {
              key: "sourcePath",
              value: "/data/search/public-search-source-replica.sqlite",
            },
            { key: "schemaVersion", value: "13" },
          ],
        };
      }

      return { rows: [{ count: 1 }] };
    });

    mocks.closeStatusClient.mockReturnValue(undefined);
    mocks.createClient.mockImplementation(
      (config: LibSqlClientConfigSnapshot) => {
        mocks.createClientConfigs.push({ ...config });

        return {
          close: mocks.closeStatusClient,
          execute: mocks.statusExecute,
        };
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("syncs and passes a dedicated retained source replica in production", async () => {
    const { ensurePublicSearchIndex } = await import(
      "@/server/search/public-search-index"
    );

    await ensurePublicSearchIndex();

    expect(mocks.createClientConfigs).not.toContainEqual(
      expect.objectContaining({
        url: "file:/data/search/public-search-source-replica.sqlite",
      }),
    );
    expect(mocks.syncWorker).toHaveBeenCalledTimes(1);
    const syncCall = mocks.execFilePromisified.mock.calls.find(([, args]) =>
      args?.[0]?.endsWith("sync-public-search-source-replica.mjs"),
    );
    expect(syncCall).toBeDefined();
    const syncArgs = syncCall?.[1] ?? [];

    expect(syncArgs).not.toContain("/data/turso-replica.db");
    expect(syncArgs).toContain(
      "/data/search/public-search-source-replica.sqlite",
    );
    const syncOptions = syncCall?.[2] as
      | { env?: NodeJS.ProcessEnv }
      | undefined;
    expect(syncOptions?.env).toMatchObject({
      DATABASE_URL: "libsql://primary-db",
      TURSO_DATABASE_AUTH_TOKEN: "test-token",
    });
    const calls = mocks.execFilePromisified.mock.calls;
    const syncCallIndex = calls.findIndex(([, args]) =>
      args?.[0]?.endsWith("sync-public-search-source-replica.mjs"),
    );
    const postSyncCheckIndex = calls.findIndex(
      ([file], index) => file === "sqlite3" && index > syncCallIndex,
    );
    const buildCallIndex = calls.findIndex(([, args]) =>
      args?.[0]?.endsWith("build-public-search-index.mjs"),
    );
    expect(syncCallIndex).toBeLessThan(postSyncCheckIndex);
    expect(postSyncCheckIndex).toBeLessThan(buildCallIndex);
    expect(mocks.execFilePromisified).toHaveBeenCalledWith(
      process.execPath,
      [
        expect.stringContaining("scripts/build-public-search-index.mjs"),
        "--source",
        "/data/search/public-search-source-replica.sqlite",
        "--target",
        "/data/search/public-search.sqlite",
      ],
      expect.objectContaining({
        env: process.env,
      }),
    );
  });

  it("does not sync or rebuild when public search index refreshes are disabled", async () => {
    mockEnv.PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS = "0";
    mocks.indexExists = true;

    const { ensurePublicSearchIndex } = await import(
      "@/server/search/public-search-index"
    );

    const status = await ensurePublicSearchIndex();

    expect(status.status).toBe("stale");
    expect(status.sourcePath).toBe(
      "/data/search/public-search-source-replica.sqlite",
    );
    expect(mocks.syncWorker).not.toHaveBeenCalled();
    expect(mocks.execFilePromisified).not.toHaveBeenCalled();
  });

  it("keeps an old index usable while repairing its source replica", async () => {
    mocks.indexBuiltAt = new Date(0).toISOString();
    mocks.indexExists = true;
    mocks.syncWorker.mockRejectedValueOnce(
      Object.assign(new Error("sync worker failed"), {
        stderr: "InvalidLocalState",
        stdout: JSON.stringify({
          ok: false,
          error: "InvalidLocalState",
          phase: "source_sync",
        }),
      }),
    );
    const log = vi.spyOn(console, "log");

    const { ensurePublicSearchIndex, isPublicSearchIndexUsable } = await import(
      "@/server/search/public-search-index"
    );

    const status = await ensurePublicSearchIndex();

    expect(status.status).toBe("stale");
    expect(isPublicSearchIndexUsable(status)).toBe(true);
    await vi.waitFor(() => {
      expect(mocks.syncWorker).toHaveBeenCalledTimes(2);
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining("public_search_source_recovery_succeeded"),
      );
    });
    expect(mocks.rename.mock.calls.map(([source]) => source)).toEqual(
      ["", "-info", "-wal", "-shm", "-journal", "-client_wal_index"].map(
        (suffix) => `/data/search/public-search-source-replica.sqlite${suffix}`,
      ),
    );
    expect(mocks.rm).toHaveBeenCalledWith(
      "/data/search/public-search-source-replica.sqlite.quarantine",
      { force: true, recursive: true },
    );
    for (const phase of ["pre_sync", "post_sync", "post_build"]) {
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining(`"phase":"${phase}"`),
      );
    }
  });

  it("repairs a source replica that fails its post-sync integrity check", async () => {
    mocks.execFilePromisified
      .mockResolvedValueOnce({ stderr: "", stdout: "ok\n" })
      .mockImplementationOnce(async () => mocks.syncWorker())
      .mockRejectedValueOnce(
        Object.assign(new Error("sqlite3 quick_check failed"), {
          code: 11,
          stderr: "database disk image is malformed",
        }),
      );
    const log = vi.spyOn(console, "log");

    const { ensurePublicSearchIndex } = await import(
      "@/server/search/public-search-index"
    );

    await ensurePublicSearchIndex();

    expect(mocks.syncWorker).toHaveBeenCalledTimes(2);
    expect(
      mocks.execFilePromisified.mock.calls.filter(([, args]) =>
        args?.[0]?.endsWith("build-public-search-index.mjs"),
      ),
    ).toHaveLength(1);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"phase":"post_sync"'),
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("public_search_source_recovery_succeeded"),
    );
  });

  it("repairs corruption visible to the open libSQL client after sync", async () => {
    mocks.syncWorker.mockRejectedValueOnce(
      Object.assign(new Error("sync worker failed"), {
        stderr: "database disk image is malformed",
        stdout: JSON.stringify({
          ok: false,
          error: "database disk image is malformed",
          phase: "post_sync_client",
        }),
      }),
    );
    const log = vi.spyOn(console, "log");

    const { ensurePublicSearchIndex } = await import(
      "@/server/search/public-search-index"
    );

    await ensurePublicSearchIndex();

    expect(mocks.syncWorker).toHaveBeenCalledTimes(2);
    expect(
      mocks.execFilePromisified.mock.calls.filter(([, args]) =>
        args?.[0]?.endsWith("build-public-search-index.mjs"),
      ),
    ).toHaveLength(1);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"phase":"post_sync_client"'),
    );
  });

  it("does not quarantine the source when sqlite3 cannot start", async () => {
    mocks.execFilePromisified.mockRejectedValueOnce(
      Object.assign(new Error("spawn sqlite3 ENOENT"), { code: "ENOENT" }),
    );

    const { ensurePublicSearchIndex } = await import(
      "@/server/search/public-search-index"
    );

    await expect(ensurePublicSearchIndex()).rejects.toThrow(
      "spawn sqlite3 ENOENT",
    );
    expect(mocks.syncWorker).not.toHaveBeenCalled();
    expect(mocks.rm).not.toHaveBeenCalled();
    expect(mocks.rename).not.toHaveBeenCalled();
  });

  it("prepares a search source replica without requiring the live app replica env", async () => {
    mockEnv.TURSO_EMBEDDED_REPLICA_URL = undefined;

    const { ensurePublicSearchIndex } = await import(
      "@/server/search/public-search-index"
    );

    await ensurePublicSearchIndex();

    expect(mocks.syncWorker).toHaveBeenCalledTimes(1);
    const syncCall = mocks.execFilePromisified.mock.calls.find(([, args]) =>
      args?.[0]?.endsWith("sync-public-search-source-replica.mjs"),
    );
    expect(syncCall?.[1]).toEqual([
      expect.stringContaining("scripts/sync-public-search-source-replica.mjs"),
      "--source",
      "/data/search/public-search-source-replica.sqlite",
    ]);
  });
});
