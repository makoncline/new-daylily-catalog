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

const mocks = vi.hoisted(() => {
  const execFilePromisified = vi.fn();
  const execFile = vi.fn();
  const promisifyCustom = Symbol.for("nodejs.util.promisify.custom");
  Object.defineProperty(execFile, promisifyCustom, {
    value: execFilePromisified,
  });

  return {
    closeSourceClient: vi.fn(),
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
    rename: vi.fn(),
    rm: vi.fn(),
    sourceSync: vi.fn(),
    stat: vi.fn(),
    statusExecute: vi.fn(),
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

    mocks.closeSourceClient.mockReset();
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
    mocks.sourceSync.mockReset();
    mocks.stat.mockReset();
    mocks.statusExecute.mockReset();
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

    mocks.execFilePromisified.mockImplementation(async (file: string) => {
      if (file === "sqlite3") {
        return { stderr: "", stdout: "ok\n" };
      }

      mocks.indexExists = true;

      return {
        stderr: "",
        stdout: "Source DB: /data/search/public-search-source-replica.sqlite\n",
      };
    });

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

    mocks.sourceSync.mockResolvedValue(undefined);
    mocks.closeSourceClient.mockReturnValue(undefined);
    mocks.closeStatusClient.mockReturnValue(undefined);
    mocks.createClient.mockImplementation(
      (config: LibSqlClientConfigSnapshot) => {
        mocks.createClientConfigs.push({ ...config });

        if (
          config.url === "file:/data/search/public-search-source-replica.sqlite"
        ) {
          return {
            close: mocks.closeSourceClient,
            sync: mocks.sourceSync,
          };
        }

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

    expect(mocks.createClientConfigs[0]).toEqual({
      authToken: "test-token",
      syncUrl: "libsql://primary-db",
      url: "file:/data/search/public-search-source-replica.sqlite",
    });
    expect(mocks.sourceSync).toHaveBeenCalledTimes(1);
    expect(mocks.closeSourceClient).toHaveBeenCalledTimes(1);
    const execArgs = mocks.execFilePromisified.mock.calls.find(
      ([file]) => file === process.execPath,
    )?.[1];

    expect(execArgs).not.toContain("/data/turso-replica.db");
    expect(execArgs).toContain(
      "/data/search/public-search-source-replica.sqlite",
    );
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
    expect(mocks.sourceSync).not.toHaveBeenCalled();
    expect(mocks.execFilePromisified).not.toHaveBeenCalled();
  });

  it("keeps an old index usable while repairing its source replica", async () => {
    mocks.indexBuiltAt = new Date(0).toISOString();
    mocks.indexExists = true;
    mocks.sourceSync.mockRejectedValueOnce(new Error("InvalidLocalState"));
    const log = vi.spyOn(console, "log");

    const { ensurePublicSearchIndex, isPublicSearchIndexUsable } = await import(
      "@/server/search/public-search-index"
    );

    const status = await ensurePublicSearchIndex();

    expect(status.status).toBe("stale");
    expect(isPublicSearchIndexUsable(status)).toBe(true);
    await vi.waitFor(() =>
      expect(mocks.execFilePromisified).toHaveBeenCalledWith(
        process.execPath,
        expect.anything(),
        expect.anything(),
      ),
    );
    expect(mocks.sourceSync).toHaveBeenCalledTimes(2);
    expect(mocks.rename.mock.calls.map(([source]) => source)).toEqual(
      ["", "-info", "-wal", "-shm", "-journal"].map(
        (suffix) => `/data/search/public-search-source-replica.sqlite${suffix}`,
      ),
    );
    expect(mocks.rm).toHaveBeenCalledWith(
      "/data/search/public-search-source-replica.sqlite.quarantine",
      { force: true, recursive: true },
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("public_search_source_recovery_succeeded"),
    );
    for (const phase of ["pre_sync", "post_sync", "post_build"]) {
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining(`"phase":"${phase}"`),
      );
    }
  });

  it("prepares a search source replica without requiring the live app replica env", async () => {
    mockEnv.TURSO_EMBEDDED_REPLICA_URL = undefined;

    const { ensurePublicSearchIndex } = await import(
      "@/server/search/public-search-index"
    );

    await ensurePublicSearchIndex();

    expect(mocks.createClientConfigs[0]).toEqual({
      authToken: "test-token",
      syncUrl: "libsql://primary-db",
      url: "file:/data/search/public-search-source-replica.sqlite",
    });
    expect(mocks.execFilePromisified).toHaveBeenCalledWith(
      process.execPath,
      expect.arrayContaining([
        "--source",
        "/data/search/public-search-source-replica.sqlite",
      ]),
      expect.anything(),
    );
  });
});
