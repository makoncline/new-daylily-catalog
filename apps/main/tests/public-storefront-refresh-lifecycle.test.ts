// @vitest-environment node

import { EventEmitter } from "node:events";
import { PassThrough, Writable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  build: vi.fn(),
  spawn: vi.fn(),
  sync: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/env", () => ({
  env: {
    PUBLIC_STOREFRONT_ARTIFACT_ROOT: "/tmp/storefront-refresh-test",
    PUBLIC_STOREFRONT_SELLER_IDS: "3",
  },
}));

vi.mock("@/server/db", () => ({
  syncEmbeddedReplica: mocks.sync,
}));

vi.mock("../scripts/build-public-storefront-artifacts.mjs", () => ({
  buildPublicStorefrontArtifacts: mocks.build,
}));

vi.mock("node:child_process", () => ({
  spawn: mocks.spawn,
}));

interface RefreshResult {
  generatedAt: string;
  outputRoot: string;
  ready: true;
  removedArtifacts: number | null;
  sellers: Array<{
    artifact: string;
    byteLength: number;
    id: string;
  }>;
  warnings: string[];
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createWatchdogProcess(commands: string[]) {
  const child = new EventEmitter() as EventEmitter & {
    kill: ReturnType<typeof vi.fn>;
    stdin: Writable;
    stdout: PassThrough;
  };
  child.kill = vi.fn();
  child.stdout = new PassThrough();
  child.stdin = new Writable({
    write(chunk, _encoding, callback) {
      const command = String(chunk);
      commands.push(command);
      queueMicrotask(() => {
        if (command === "watch 4321\n") {
          child.stdout.write("watching 4321\n");
        } else if (command === "unwatch 4321\n") {
          child.stdout.write("unwatched 4321\n");
        } else if (command === "disarm\n") {
          child.stdout.end("disarmed\n");
          child.emit("close", 0, null);
        }
      });
      callback();
    },
  });
  queueMicrotask(() => child.stdout.write("ready\n"));
  return child;
}

describe("public storefront refresh lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the watchdog armed until the artifact operation settles", async () => {
    const commands: string[] = [];
    mocks.spawn.mockReturnValue(createWatchdogProcess(commands));
    mocks.sync.mockResolvedValue({ source: "replica" });
    const build = deferred<RefreshResult>();
    mocks.build.mockImplementation(async (options: unknown) => {
      if (
        options === null ||
        typeof options !== "object" ||
        !("targetWorkerLifecycle" in options)
      ) {
        throw new Error("The target worker lifecycle was not configured.");
      }
      const lifecycle = options.targetWorkerLifecycle as {
        onWorkerStarted: (pid: number) => Promise<void>;
        onWorkerStopped: (pid: number) => Promise<void>;
      };
      await lifecycle.onWorkerStarted(4321);
      const result = await build.promise;
      await lifecycle.onWorkerStopped(4321);
      return result;
    });
    const { refreshPublicStorefrontArtifacts } = await import(
      "@/server/storefront/public-storefront-refresh"
    );

    const refresh = refreshPublicStorefrontArtifacts();
    await vi.waitFor(() => expect(mocks.build).toHaveBeenCalledTimes(1));

    expect(commands).toEqual(["watch 4321\n"]);

    const result: RefreshResult = {
      generatedAt: "2026-08-29T20:00:00.000Z",
      outputRoot: "/tmp/storefront-refresh-test",
      ready: true,
      removedArtifacts: 0,
      sellers: [
        {
          artifact: "seller-3.json",
          byteLength: 123,
          id: "3",
        },
      ],
      warnings: [],
    };
    build.resolve(result);

    await expect(refresh).resolves.toEqual(result);
    expect(commands).toEqual(["watch 4321\n", "unwatch 4321\n", "disarm\n"]);
  });
});
