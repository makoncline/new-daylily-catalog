import { spawn } from "node:child_process";

/**
 * @param {unknown} message
 */
function serializeWorkerMessage(message) {
  return JSON.stringify(message, (_key, value) => {
    if (typeof value !== "bigint") return value;

    const numberValue = Number(value);
    if (!Number.isSafeInteger(numberValue)) {
      throw new Error(
        `Worker stream value exceeds the safe integer range: ${value}`,
      );
    }

    return numberValue;
  })
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

/** @param {import("node:stream").Writable} input */
function createWorkerWriter(input) {
  /** @type {Error | undefined} */
  let inputError;
  /** @type {Set<(error: Error) => void>} */
  const pendingWriteRejectors = new Set();

  // Keep this listener for the complete child lifetime. A pipe can emit an
  // error separately from the write callback when the worker exits early.
  input.on("error", (error) => {
    inputError = error;
    for (const rejectWrite of pendingWriteRejectors) rejectWrite(error);
    pendingWriteRejectors.clear();
  });

  /** @param {unknown} message */
  return async function writeWorkerMessage(message) {
    if (inputError) throw inputError;
    const line = `${serializeWorkerMessage(message)}\n`;

    await new Promise((resolve, reject) => {
      /** @param {Error} error */
      const rejectWrite = (error) => reject(error);
      pendingWriteRejectors.add(rejectWrite);

      input.write(line, "utf8", (error) => {
        pendingWriteRejectors.delete(rejectWrite);
        if (error) {
          reject(error);
          return;
        }
        if (inputError) {
          reject(inputError);
          return;
        }

        resolve(undefined);
      });
    });
  };
}

/**
 * @param {string} output
 */
function parseWorkerResult(output) {
  const resultLine = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!resultLine) {
    throw new Error("Target worker returned no result.");
  }

  return JSON.parse(resultLine);
}

/**
 * @param {{targetWorkerArgs: string[], targetWorkerPath: string}} options
 */
function startTargetWorker({ targetWorkerArgs, targetWorkerPath }) {
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
        const detail =
          stderr.trim() || (signal ? `signal ${signal}` : `exit code ${code}`);
        reject(new Error(`Target worker failed: ${detail}`));
        return;
      }

      try {
        resolve(parseWorkerResult(stdout));
      } catch (error) {
        reject(error);
      }
    });
  });

  // The source stream can still be active when the worker fails. Attach a
  // handler now, then surface the failure when the stream awaits completion.
  void completion.catch(() => undefined);

  const write = createWorkerWriter(child.stdin);

  return {
    completion,
    end: () => child.stdin.end(),
    write,
  };
}

/** @param {unknown} error */
function isBrokenPipeError(error) {
  return (
    error instanceof Error &&
    "code" in error &&
    ["EPIPE", "ERR_STREAM_DESTROYED", "ERR_STREAM_WRITE_AFTER_END"].includes(
      String(error.code),
    )
  );
}

/**
 * Stream bounded source messages to a target-only Node worker. The worker
 * receives the producer result in the final completion message.
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
  if (!targetWorkerPath) throw new Error("targetWorkerPath is required.");

  const worker = startTargetWorker({ targetWorkerArgs, targetWorkerPath });
  let completedInput = false;

  try {
    const sourceResult = await stream(worker.write);
    await worker.write({ sourceResult, type: "complete" });
    completedInput = true;
    worker.end();

    const targetResult = /** @type {TargetResult} */ (await worker.completion);
    return { sourceResult, targetResult };
  } catch (error) {
    worker.end();
    let workerError;
    try {
      await worker.completion;
    } catch (failure) {
      workerError = failure;
    }

    if ((completedInput || isBrokenPipeError(error)) && workerError) {
      throw workerError;
    }

    throw error;
  }
}
