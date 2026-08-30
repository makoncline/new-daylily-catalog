// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    buildPublicSearchIndex: vi.fn(),
    closeStatusClient: vi.fn(),
    createClient: vi.fn(),
    events: [] as string[],
    indexBuiltAt: new Date().toISOString(),
    indexExists: false,
    replicaDb: { name: "exact-replica-client" },
    stat: vi.fn(),
    statusExecute: vi.fn(),
    syncEmbeddedReplica: vi.fn(),
  };
});

const mockEnv = vi.hoisted(() => ({
  PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS: undefined as string | undefined,
}));

function missingFileError(filePath: string) {
  const error = new Error(
    `ENOENT: no such file or directory, stat '${filePath}'`,
  );
  Object.assign(error, { code: "ENOENT" });
  return error;
}

vi.mock("server-only", () => ({}));

vi.mock("@/env", () => ({
  env: {
    get PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS() {
      return mockEnv.PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS;
    },
  },
}));

vi.mock("node:fs/promises", () => ({
  stat: mocks.stat,
}));

vi.mock("@libsql/client", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/server/db", () => ({
  syncEmbeddedReplica: mocks.syncEmbeddedReplica,
}));

vi.mock("@/server/search/build-public-search-index.js", () => ({
  buildPublicSearchIndex: mocks.buildPublicSearchIndex,
}));

describe("public search index refresh", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    delete (
      globalThis as typeof globalThis & {
        publicSearchIndexRefreshPromise?: unknown;
      }
    ).publicSearchIndexRefreshPromise;

    mockEnv.PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS = undefined;
    mocks.events.length = 0;
    mocks.indexBuiltAt = new Date().toISOString();
    mocks.indexExists = false;

    mocks.buildPublicSearchIndex.mockReset();
    mocks.closeStatusClient.mockReset();
    mocks.createClient.mockReset();
    mocks.stat.mockReset();
    mocks.statusExecute.mockReset();
    mocks.syncEmbeddedReplica.mockReset();

    mocks.stat.mockImplementation(async (filePath: string) => {
      if (filePath === "/data/search/public-search.sqlite") {
        if (!mocks.indexExists) {
          throw missingFileError(filePath);
        }

        return { mtimeMs: Date.now() };
      }
      return { mtimeMs: Date.now() };
    });

    mocks.syncEmbeddedReplica.mockImplementation(async () => {
      mocks.events.push("sync");
      return mocks.replicaDb;
    });
    mocks.buildPublicSearchIndex.mockImplementation(async () => {
      mocks.events.push("build");
      mocks.indexBuiltAt = new Date().toISOString();
      mocks.indexExists = true;
      return {
        cultivars: 1,
        elapsedMs: 1,
        linkedListings: 1,
        quickCheck: "ok",
        schemaVersion: "13",
      };
    });

    mocks.statusExecute.mockImplementation(async (sql: string) => {
      if (sql.includes("SearchIndexMeta")) {
        return {
          rows: [
            { key: "builtAt", value: mocks.indexBuiltAt },
            { key: "sourceLabel", value: "embedded-replica" },
            { key: "schemaVersion", value: "13" },
          ],
        };
      }

      return { rows: [{ count: 1 }] };
    });

    mocks.closeStatusClient.mockReturnValue(undefined);
    mocks.createClient.mockReturnValue({
      close: mocks.closeStatusClient,
      execute: mocks.statusExecute,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("syncs before it streams the exact normal replica to the target worker", async () => {
    const { ensurePublicSearchIndex } = await import(
      "@/server/search/public-search-index"
    );

    const status = await ensurePublicSearchIndex();

    expect(mocks.events).toEqual(["sync", "build"]);
    const buildOptions = mocks.buildPublicSearchIndex.mock.calls[0]?.[0] as {
      sourceDb: unknown;
      sourceLabel: string;
      targetPath: string;
      targetWorkerPath: string;
    };
    expect(buildOptions).toMatchObject({
      sourceDb: mocks.replicaDb,
      sourceLabel: "embedded-replica",
      targetPath: "/data/search/public-search.sqlite",
    });
    expect(buildOptions.targetWorkerPath).toContain(
      "scripts/build-public-search-index-target.mjs",
    );
    expect(status).toMatchObject({
      exists: true,
      sourceLabel: "embedded-replica",
      status: "fresh",
    });
  });

  it("shares one refresh across concurrent ensure calls", async () => {
    let finishBuild: (() => void) | undefined;
    mocks.buildPublicSearchIndex.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishBuild = () => {
            mocks.indexBuiltAt = new Date().toISOString();
            mocks.indexExists = true;
            resolve({
              cultivars: 1,
              elapsedMs: 1,
              linkedListings: 1,
              quickCheck: "ok",
              schemaVersion: "13",
            });
          };
        }),
    );
    const { ensurePublicSearchIndex } = await import(
      "@/server/search/public-search-index"
    );

    const firstEnsure = ensurePublicSearchIndex();
    const secondEnsure = ensurePublicSearchIndex();

    await vi.waitFor(() => {
      expect(mocks.buildPublicSearchIndex).toHaveBeenCalledOnce();
    });
    expect(mocks.syncEmbeddedReplica).toHaveBeenCalledOnce();

    finishBuild?.();
    const [firstStatus, secondStatus] = await Promise.all([
      firstEnsure,
      secondEnsure,
    ]);

    expect(firstStatus).toEqual(secondStatus);
    expect(mocks.syncEmbeddedReplica).toHaveBeenCalledOnce();
    expect(mocks.buildPublicSearchIndex).toHaveBeenCalledOnce();
  });

  it("does not fall back to the remote primary when production has no replica", async () => {
    mocks.syncEmbeddedReplica.mockRejectedValue(
      new Error("Embedded Turso replica is required in production."),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { ensurePublicSearchIndex } = await import(
      "@/server/search/public-search-index"
    );

    await expect(ensurePublicSearchIndex()).rejects.toThrow(
      "Embedded Turso replica is required in production.",
    );

    expect(mocks.syncEmbeddedReplica).toHaveBeenCalledOnce();
    expect(mocks.buildPublicSearchIndex).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"stage":"replica_sync"'),
    );
  });

  it("keeps a stale index usable when its background refresh fails", async () => {
    mocks.indexBuiltAt = new Date(0).toISOString();
    mocks.indexExists = true;
    mocks.buildPublicSearchIndex.mockImplementation(async () => {
      mocks.events.push("build");
      throw new Error("target validation failed");
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { ensurePublicSearchIndex, isPublicSearchIndexUsable } = await import(
      "@/server/search/public-search-index"
    );

    const status = await ensurePublicSearchIndex();

    expect(status.status).toBe("stale");
    expect(isPublicSearchIndexUsable(status)).toBe(true);
    await vi.waitFor(() => {
      expect(mocks.buildPublicSearchIndex).toHaveBeenCalledOnce();
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining('"stage":"index_build"'),
      );
    });

    mockEnv.PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS = "0";
    const statusAfterFailure = await ensurePublicSearchIndex();
    expect(statusAfterFailure.exists).toBe(true);
    expect(isPublicSearchIndexUsable(statusAfterFailure)).toBe(true);
    expect(mocks.buildPublicSearchIndex).toHaveBeenCalledOnce();
  });

  it("does not sync or build when refresh is disabled", async () => {
    mockEnv.PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS = "0";
    mocks.indexBuiltAt = new Date(0).toISOString();
    mocks.indexExists = true;
    const { ensurePublicSearchIndex } = await import(
      "@/server/search/public-search-index"
    );

    const status = await ensurePublicSearchIndex();

    expect(status.status).toBe("stale");
    expect(mocks.syncEmbeddedReplica).not.toHaveBeenCalled();
    expect(mocks.buildPublicSearchIndex).not.toHaveBeenCalled();
  });
});
