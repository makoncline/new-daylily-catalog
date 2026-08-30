import "server-only";

import { spawn } from "node:child_process";
import path from "node:path";
import { createInterface } from "node:readline";
import { env } from "@/env";
import { syncEmbeddedReplica } from "@/server/db";
import { buildPublicStorefrontArtifacts } from "../../../scripts/build-public-storefront-artifacts.mjs";

export interface PublicStorefrontRefreshResult {
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

const globalForPublicStorefrontRefresh = globalThis as unknown as {
  publicStorefrontRefreshPromise:
    | Promise<PublicStorefrontRefreshResult>
    | undefined;
};

// Stop the app before the loopback client reaches its 15-minute deadline.
// The deployed Compose restart policy then starts a new replica owner.
const refreshWatchdogTimeoutMilliseconds = 14 * 60 * 1_000;
const refreshWatchdogProtocolTimeoutMilliseconds = 10_000;

interface WatchdogExit {
  code: number | null;
  signal: NodeJS.Signals | null;
}

function terminateCurrentProcess() {
  process.kill(process.pid, "SIGKILL");
}

function withTimeout<T>(
  operation: Promise<T>,
  timeoutMilliseconds: number,
  message: string,
) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMilliseconds);

    operation.then(
      (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(
          error instanceof Error
            ? error
            : new Error("The storefront refresh operation failed."),
        );
      },
    );
  });
}

function getAppRoot() {
  const cwd = process.cwd();

  if (process.env.NODE_ENV !== "production" || cwd.endsWith("apps/main")) {
    return cwd;
  }

  return path.join(cwd, "apps/main");
}

function getConfiguredSellerIds() {
  const configuredSellerIds = env.PUBLIC_STOREFRONT_SELLER_IDS;
  if (!configuredSellerIds) {
    throw new Error("PUBLIC_STOREFRONT_SELLER_IDS is required.");
  }

  const sellerIds = configuredSellerIds
    .split(",")
    .map((sellerId) => sellerId.trim());
  if (
    sellerIds.some((sellerId) => sellerId.length === 0) ||
    new Set(sellerIds).size !== sellerIds.length
  ) {
    throw new Error(
      "PUBLIC_STOREFRONT_SELLER_IDS must contain unique, nonempty comma-separated IDs.",
    );
  }

  return sellerIds;
}

async function armRefreshWatchdog(
  terminateProcess: () => void = terminateCurrentProcess,
) {
  const watchdogPath = path.join(
    getAppRoot(),
    "scripts/storefront-artifact-refresh-watchdog.mjs",
  );
  const child = spawn(
    process.execPath,
    [
      watchdogPath,
      String(process.pid),
      String(refreshWatchdogTimeoutMilliseconds),
    ],
    {
      detached: true,
      stdio: ["pipe", "pipe", "inherit"],
    },
  );
  child.stdin.on("error", () => {
    // The exit result below is the authoritative watchdog status.
  });

  let state: "active" | "disarming" | "starting" | "stopping" = "starting";
  let closedExit: WatchdogExit | null = null;
  let spawnError: Error | null = null;
  child.once("error", (error) => {
    spawnError = error;
  });
  const closePromise = new Promise<WatchdogExit>((resolve) => {
    child.once("close", (code, signal) => {
      closedExit = { code, signal };
      resolve(closedExit);
      if (state === "active") terminateProcess();
    });
  });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  const lineIterator = lines[Symbol.asyncIterator]();

  const stopBeforeRefresh = async (error: unknown) => {
    state = "stopping";
    child.kill("SIGKILL");
    await withTimeout(
      closePromise,
      refreshWatchdogProtocolTimeoutMilliseconds,
      "The storefront refresh watchdog did not stop.",
    ).catch(() => terminateProcess());
    lines.close();
    throw error;
  };

  let readyEvent:
    | { kind: "close"; result: WatchdogExit }
    | { kind: "line"; result: IteratorResult<string> };
  try {
    readyEvent = await withTimeout(
      Promise.race([
        lineIterator.next().then((result) => ({
          kind: "line" as const,
          result,
        })),
        closePromise.then((result) => ({
          kind: "close" as const,
          result,
        })),
      ]),
      refreshWatchdogProtocolTimeoutMilliseconds,
      "The storefront refresh watchdog did not become ready.",
    );
  } catch (error) {
    return stopBeforeRefresh(error);
  }

  if (
    readyEvent.kind !== "line" ||
    readyEvent.result.done ||
    readyEvent.result.value !== "ready"
  ) {
    return stopBeforeRefresh(
      spawnError ?? new Error("The storefront refresh watchdog failed."),
    );
  }
  if (closedExit) {
    return stopBeforeRefresh(
      spawnError ?? new Error("The storefront refresh watchdog stopped."),
    );
  }
  state = "active";

  const sendCommand = async (command: string, expectedResponse: string) => {
    await new Promise<void>((resolve, reject) => {
      child.stdin.write(`${command}\n`, "utf8", (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    const response = await withTimeout(
      lineIterator.next(),
      refreshWatchdogProtocolTimeoutMilliseconds,
      "The storefront refresh watchdog did not acknowledge a command.",
    );
    if (response.done || response.value !== expectedResponse) {
      terminateProcess();
      throw new Error(
        "The storefront refresh watchdog returned an invalid response.",
      );
    }
  };

  return {
    async watchTargetWorker(pid: number) {
      await sendCommand(`watch ${pid}`, `watching ${pid}`);
    },
    async unwatchTargetWorker(pid: number) {
      await sendCommand(`unwatch ${pid}`, `unwatched ${pid}`);
    },
    async disarm() {
      state = "disarming";
      child.stdin.end("disarm\n");

      try {
        const [disarmed, exit] = await withTimeout(
          Promise.all([lineIterator.next(), closePromise]),
          refreshWatchdogProtocolTimeoutMilliseconds,
          "The storefront refresh watchdog did not disarm.",
        );
        lines.close();
        if (
          disarmed.done ||
          disarmed.value !== "disarmed" ||
          exit.code !== 0 ||
          exit.signal !== null
        ) {
          throw (
            spawnError ??
            new Error("The storefront refresh watchdog did not exit cleanly.")
          );
        }
      } catch (error) {
        child.kill("SIGKILL");
        await withTimeout(
          closePromise,
          refreshWatchdogProtocolTimeoutMilliseconds,
          "The storefront refresh watchdog could not be terminated.",
        ).catch(() => terminateProcess());
        lines.close();
        throw error;
      }
    },
  };
}

async function runPublicStorefrontRefresh() {
  const output = env.PUBLIC_STOREFRONT_ARTIFACT_ROOT;
  if (!output) {
    throw new Error("PUBLIC_STOREFRONT_ARTIFACT_ROOT is required.");
  }

  const watchdog = await armRefreshWatchdog();
  try {
    const sourceDb = await syncEmbeddedReplica();
    return (await buildPublicStorefrontArtifacts({
      output,
      sellerIds: getConfiguredSellerIds(),
      sourceDb,
      targetWorkerLifecycle: {
        onWorkerStarted: (pid: number) => watchdog.watchTargetWorker(pid),
        onWorkerStopped: (pid: number) => watchdog.unwatchTargetWorker(pid),
      },
      targetWorkerPath: path.join(
        getAppRoot(),
        "scripts/build-public-storefront-artifacts-target.mjs",
      ),
    })) as PublicStorefrontRefreshResult;
  } finally {
    await watchdog.disarm();
  }
}

export async function refreshPublicStorefrontArtifacts() {
  globalForPublicStorefrontRefresh.publicStorefrontRefreshPromise ??=
    runPublicStorefrontRefresh().finally(() => {
      globalForPublicStorefrontRefresh.publicStorefrontRefreshPromise =
        undefined;
    });

  return globalForPublicStorefrontRefresh.publicStorefrontRefreshPromise;
}
