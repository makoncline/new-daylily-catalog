// @vitest-environment node

import { spawn, type ChildProcess } from "node:child_process";
import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, describe, expect, it } from "vitest";

const watchdogPath = path.join(
  process.cwd(),
  "scripts/storefront-artifact-refresh-watchdog.mjs",
);
const builderUrl = pathToFileURL(
  path.join(process.cwd(), "scripts/build-public-storefront-artifacts.mjs"),
).href;
const temporaryRoots = new Set<string>();
const children = new Set<ChildProcess>();

const hostSource = String.raw`
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";

const [watchdogPath, builderUrl, lateTargetPath, statePath, outputRoot, timeoutValue] =
  process.argv.slice(2);
const priorAttempt = Number(await readFile(statePath, "utf8").catch(() => "0"));
const attempt = priorAttempt + 1;
await writeFile(statePath, String(attempt), "utf8");
const { publishPublicStorefrontArtifacts } = await import(builderUrl);

async function armWatchdog(timeout) {
  const watchdog = spawn(
    process.execPath,
    [watchdogPath, String(process.pid), String(timeout)],
    {
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  watchdog.stdout.setEncoding("utf8");
  watchdog.stderr.pipe(process.stderr);
  const lines = createInterface({ input: watchdog.stdout, crlfDelay: Infinity });
  const lineIterator = lines[Symbol.asyncIterator]();
  const close = new Promise((resolve) => {
    watchdog.once("close", (code, signal) => resolve({ code, signal }));
  });
  const ready = await lineIterator.next();
  if (ready.done || ready.value !== "ready") {
    throw new Error("Watchdog did not become ready.");
  }

  return {
    async command(command, expected) {
      watchdog.stdin.write(command + "\n");
      const response = await lineIterator.next();
      if (response.done || response.value !== expected) {
        throw new Error("Watchdog command failed: " + command);
      }
    },
    async disarm() {
      watchdog.stdin.end("disarm\n");
      const [response, result] = await Promise.all([
        lineIterator.next(),
        close,
      ]);
      if (
        response.done ||
        response.value !== "disarmed" ||
        result.code !== 0 ||
        result.signal !== null
      ) {
        throw new Error("Watchdog did not disarm cleanly.");
      }
    },
  };
}

const watchdog = await armWatchdog(
  attempt === 1 ? Number(timeoutValue) : 2_000,
);
try {
  const result = await publishPublicStorefrontArtifacts(
    { output: outputRoot, sellerIds: ["seller"] },
    {
      checkpoint: async (label) => {
        if (attempt === 1 && label === "after_build_lock_created") {
          const lateTarget = spawn(
            process.execPath,
            [lateTargetPath, builderUrl, outputRoot],
            { stdio: "ignore" },
          );
          if (lateTarget.pid === undefined) {
            throw new Error("The late target did not start.");
          }
          await watchdog.command(
            "watch " + lateTarget.pid,
            "watching " + lateTarget.pid,
          );
          process.stdout.write(
            JSON.stringify({
              attempt,
              pid: process.pid,
              ready: false,
              targetPid: lateTarget.pid,
            }) + "\n",
          );
          await new Promise(() => undefined);
        }
      },
      getSnapshot: async (sellerId, generatedAt) => ({
        generatedAt,
        marker: "retry",
        seller: { id: sellerId },
      }),
      lockOptions: { heartbeatMilliseconds: 40, staleMilliseconds: 150 },
    },
  );
  await watchdog.disarm();
  process.stdout.write(
    JSON.stringify({ attempt, pid: process.pid, ready: result.ready }) + "\n",
  );
} catch (error) {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
`;

function startHost(
  hostPath: string,
  lateTargetPath: string,
  statePath: string,
  outputRoot: string,
  timeoutMilliseconds: number,
) {
  const child = spawn(
    process.execPath,
    [
      hostPath,
      watchdogPath,
      builderUrl,
      lateTargetPath,
      statePath,
      outputRoot,
      String(timeoutMilliseconds),
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  children.add(child);
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const completion = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
    stderr: string;
    stdout: string;
  }>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => {
      children.delete(child);
      resolve({ code, signal, stderr, stdout });
    });
  });

  return { child, completion, getStdout: () => stdout };
}

async function waitForOutput(getOutput: () => string, expected: string) {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    if (getOutput().includes(expected)) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out while waiting for output: ${expected}`);
}

afterEach(async () => {
  for (const child of children) child.kill("SIGKILL");
  children.clear();
  await Promise.all(
    [...temporaryRoots].map((root) =>
      rm(root, { force: true, recursive: true }),
    ),
  );
  temporaryRoots.clear();
});

describe("storefront artifact refresh watchdog", () => {
  it("terminates a hung refresh process and lets the retry acquire its resources", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "storefront-watchdog-"));
    temporaryRoots.add(root);
    const hostPath = path.join(root, "refresh-host.mjs");
    const lateTargetPath = path.join(root, "late-target.mjs");
    const statePath = path.join(root, "attempt.txt");
    const outputRoot = path.join(root, "artifacts");
    await writeFile(hostPath, hostSource, "utf8");
    await writeFile(
      lateTargetPath,
      String.raw`
import { setTimeout as delay } from "node:timers/promises";

const [builderUrl, outputRoot] = process.argv.slice(2);
const { publishPublicStorefrontArtifacts } = await import(builderUrl);
await delay(800);
await publishPublicStorefrontArtifacts(
  { output: outputRoot, sellerIds: ["seller"] },
  {
    getSnapshot: async (sellerId, generatedAt) => ({
      generatedAt,
      marker: "orphan-publication",
      seller: { id: sellerId },
    }),
    lockOptions: { heartbeatMilliseconds: 40, staleMilliseconds: 150 },
  },
);
`,
      "utf8",
    );

    const first = startHost(
      hostPath,
      lateTargetPath,
      statePath,
      outputRoot,
      200,
    );
    await waitForOutput(first.getStdout, '"ready":false');
    const firstResult = await first.completion;
    expect(firstResult).toMatchObject({
      code: null,
      signal: "SIGKILL",
      stderr: "",
    });
    const firstReceipt: unknown = JSON.parse(firstResult.stdout);
    if (
      firstReceipt === null ||
      typeof firstReceipt !== "object" ||
      !("pid" in firstReceipt) ||
      typeof firstReceipt.pid !== "number"
    ) {
      throw new Error(
        "The first refresh receipt did not contain a process ID.",
      );
    }
    await expect(
      lstat(path.join(outputRoot, ".build.lock")),
    ).resolves.toBeDefined();

    await delay(950);
    await expect(
      lstat(path.join(outputRoot, "current", "manifest.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const retry = startHost(
      hostPath,
      lateTargetPath,
      statePath,
      outputRoot,
      200,
    );
    const retryResult = await retry.completion;
    expect(retryResult).toMatchObject({
      code: 0,
      signal: null,
      stderr: "",
    });
    const retryReceipt: unknown = JSON.parse(retryResult.stdout);
    if (
      retryReceipt === null ||
      typeof retryReceipt !== "object" ||
      !("pid" in retryReceipt) ||
      typeof retryReceipt.pid !== "number"
    ) {
      throw new Error("The retry receipt did not contain a process ID.");
    }
    expect(retryReceipt).toMatchObject({ attempt: 2, ready: true });
    expect(retryReceipt.pid).not.toBe(firstReceipt.pid);
    await expect(readFile(statePath, "utf8")).resolves.toBe("2");
    await expect(
      lstat(path.join(outputRoot, ".build.lock")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      readFile(path.join(outputRoot, "current", "manifest.json"), "utf8"),
    ).resolves.toContain('"seller"');
  });
});
