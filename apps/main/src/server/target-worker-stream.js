import { spawn } from "node:child_process";

/** @param {unknown} message */
function serializeWorkerMessage(message) {
  return JSON.stringify(message, (_key, value) => {
    if (typeof value !== "bigint") return value;
    const number = Number(value);
    if (!Number.isSafeInteger(number)) {
      throw new Error(
        `Worker stream value exceeds the safe integer range: ${value}`,
      );
    }
    return number;
  });
}

/**
 * Stream source pages to a credential-free target worker, awaiting each write.
 * The worker receives sourceResult in the final completion message.
 *
 * @template SourceResult
 * @template TargetResult
 * @param {{
 *   targetWorkerArgs: string[],
 *   targetWorkerPath: string,
 *   stream: (write: (message: unknown) => Promise<void>) => Promise<SourceResult>,
 * }} options
 * @returns {Promise<{sourceResult: SourceResult, targetResult: TargetResult}>}
 */
export async function streamToTargetWorker({
  targetWorkerArgs,
  targetWorkerPath,
  stream,
}) {
  const child = spawn(
    process.execPath,
    [targetWorkerPath, ...targetWorkerArgs],
    {
      env: { NODE_ENV: process.env.NODE_ENV ?? "production" },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const completion = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code !== 0) {
        reject(
          new Error(`Target worker failed: ${stderr.trim() || signal || code}`),
        );
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim().split("\n").at(-1) ?? ""));
      } catch (error) {
        reject(error);
      }
    });
  });
  // The child can fail before source paging reaches its next write.
  void completion.catch(() => undefined);
  // Write callbacks report pipe errors; also consume the separate error event.
  child.stdin.on("error", () => undefined);
  /** @param {unknown} message */
  const writeMessage = (message) =>
    new Promise((resolve, reject) => {
      child.stdin.write(`${serializeWorkerMessage(message)}\n`, (error) => {
        if (error) reject(error);
        else resolve(undefined);
      });
    });
  let completedInput = false;

  try {
    const sourceResult = await stream(writeMessage);
    await writeMessage({ sourceResult, type: "complete" });
    completedInput = true;
    child.stdin.end();
    const targetResult = /** @type {TargetResult} */ (await completion);
    return { sourceResult, targetResult };
  } catch (error) {
    child.stdin.end();
    try {
      await completion;
    } catch (workerError) {
      if (
        completedInput ||
        (error instanceof Error &&
          "code" in error &&
          [
            "EPIPE",
            "ERR_STREAM_DESTROYED",
            "ERR_STREAM_WRITE_AFTER_END",
          ].includes(String(error.code)))
      ) {
        throw workerError;
      }
    }
    throw error;
  }
}
