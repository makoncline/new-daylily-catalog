// @vitest-environment node

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";
import { syncSourceReplica } from "../scripts/sync-public-search-source-replica.mjs";

const execFileAsync = promisify(execFile);

const workerOptions = {
  authToken: "test-token",
  sourcePath: "/tmp/public-search-source-replica.sqlite",
  syncUrl: "libsql://primary-db",
};

describe("public search source sync worker", () => {
  it("syncs, checks integrity, and closes the client in order", async () => {
    const calls: string[] = [];
    const clientFactory = vi.fn(() => ({
      close: () => calls.push("close"),
      execute: async (sql: string) => {
        calls.push(sql);
        return { rows: [{ quick_check: "ok" }] };
      },
      sync: async () => {
        calls.push("sync");
        return { frame_no: 42, frames_synced: 3 };
      },
    }));

    const result = await syncSourceReplica({
      ...workerOptions,
      clientFactory,
    });

    expect(result).toMatchObject({
      ok: true,
      frameNumber: 42,
      framesSynced: 3,
    });
    expect(calls).toEqual(["sync", "PRAGMA quick_check;", "close"]);
  });

  it("recovers only failures that indicate replica corruption", async () => {
    const corruptClose = vi.fn();
    const corruptResult = await syncSourceReplica({
      ...workerOptions,
      clientFactory: () => ({
        close: corruptClose,
        execute: vi
          .fn()
          .mockRejectedValue(new Error("database disk image is malformed")),
        sync: vi.fn().mockResolvedValue({ frame_no: 42, frames_synced: 3 }),
      }),
    });
    const networkClose = vi.fn();
    const networkResult = await syncSourceReplica({
      ...workerOptions,
      clientFactory: () => ({
        close: networkClose,
        execute: vi.fn(),
        sync: vi.fn().mockRejectedValue(new Error("connection reset")),
      }),
    });

    expect(corruptResult).toMatchObject({
      ok: false,
      phase: "post_sync_client",
    });
    expect(networkResult).toMatchObject({ ok: false, phase: null });
    expect(corruptClose).toHaveBeenCalledOnce();
    expect(networkClose).toHaveBeenCalledOnce();
  });

  it("exits with a structured error when the CLI input is invalid", async () => {
    const scriptPath = path.join(
      process.cwd(),
      "scripts/sync-public-search-source-replica.mjs",
    );

    try {
      await execFileAsync(process.execPath, [scriptPath]);
      throw new Error("Expected the sync worker to fail.");
    } catch (error) {
      expect(error).toMatchObject({ code: 1 });
      if (!(error instanceof Error) || !("stdout" in error)) {
        throw error;
      }
      expect(JSON.parse(String(error.stdout))).toEqual(
        expect.objectContaining({ ok: false, phase: null }),
      );
    }
  });
});
