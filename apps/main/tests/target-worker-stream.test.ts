// @vitest-environment node

import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { streamToTargetWorker } from "../src/server/target-worker-stream.js";

const workerPath = path.join(
  process.cwd(),
  "tests/fixtures/target-worker-stream-worker.mjs",
);

describe("target worker stream", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("preserves the NDJSON protocol and target worker errors", async () => {
    vi.stubEnv("TARGET_WORKER_SECRET_TEST", "must-not-reach-worker");
    const result = await streamToTargetWorker({
      targetWorkerArgs: ["--artifact", "sample"],
      targetWorkerPath: workerPath,
      stream: async (write) => {
        await write({
          separatorText: "first\u2028second\u2029third",
          safeInteger: 42n,
          type: "page",
        });

        return { copied: 1 };
      },
    });

    expect(result).toEqual({
      sourceResult: { copied: 1 },
      targetResult: {
        args: ["--artifact", "sample"],
        leakedSecret: null,
        messages: [
          {
            separatorText: "first\u2028second\u2029third",
            safeInteger: 42,
            type: "page",
          },
        ],
        sourceResult: { copied: 1 },
      },
    });

    await expect(
      streamToTargetWorker({
        targetWorkerArgs: [],
        targetWorkerPath: workerPath,
        stream: async (write) => {
          await write({ value: BigInt(Number.MAX_SAFE_INTEGER) + 1n });
          return null;
        },
      }),
    ).rejects.toThrow("Worker stream value exceeds the safe integer range");

    await expect(
      streamToTargetWorker({
        targetWorkerArgs: ["--fail"],
        targetWorkerPath: workerPath,
        stream: async () => ({ copied: 0 }),
      }),
    ).rejects.toThrow("Intentional target failure.");
  });

  it("reports an early target exit during a large write", async () => {
    await expect(
      streamToTargetWorker({
        targetWorkerArgs: ["--exit-early"],
        targetWorkerPath: workerPath,
        stream: async (write) => {
          await write({ payload: "x".repeat(2 * 1024 * 1024) });
          return { copied: 1 };
        },
      }),
    ).rejects.toThrow("Intentional early target exit.");
  });
});
