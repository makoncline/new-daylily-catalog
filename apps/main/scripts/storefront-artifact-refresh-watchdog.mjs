#!/usr/bin/env node

const MAXIMUM_TIMEOUT_MILLISECONDS = 60 * 60 * 1_000;
const MAXIMUM_COMMAND_BUFFER_BYTES = 1_024;

function parsePositiveInteger(value, label, maximum = Number.MAX_SAFE_INTEGER) {
  if (!/^[1-9][0-9]*$/u.test(value ?? "")) {
    throw new Error(`${label} must be a positive integer.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw new Error(`${label} is outside the permitted range.`);
  }
  return parsed;
}

function isMissingProcessError(error) {
  return error instanceof Error && error.code === "ESRCH";
}

function terminateProcess(pid) {
  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    if (!isMissingProcessError(error)) throw error;
  }
}

export async function runStorefrontArtifactRefreshWatchdog({
  input = process.stdin,
  parentPid,
  timeoutMilliseconds,
}) {
  if (parentPid !== process.ppid) {
    throw new Error("The refresh watchdog parent process does not match.");
  }

  const watchedPids = new Set();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    for (const pid of watchedPids) {
      try {
        terminateProcess(pid);
      } catch (error) {
        process.stderr.write(
          `Could not terminate watched process ${pid}: ${
            error instanceof Error ? error.message : String(error)
          }\n`,
        );
      }
    }
    terminateProcess(parentPid);
  }, timeoutMilliseconds);

  process.stdout.write("ready\n");
  input.setEncoding("utf8");
  let commandBuffer = "";

  try {
    for await (const chunk of input) {
      commandBuffer += chunk;
      if (Buffer.byteLength(commandBuffer) > MAXIMUM_COMMAND_BUFFER_BYTES) {
        throw new Error("The refresh watchdog command buffer is too large.");
      }

      let commandEnd = commandBuffer.indexOf("\n");
      while (commandEnd >= 0) {
        const command = commandBuffer.slice(0, commandEnd);
        commandBuffer = commandBuffer.slice(commandEnd + 1);

        const watchMatch = command.match(/^watch ([1-9][0-9]*)$/u);
        if (watchMatch) {
          const pid = parsePositiveInteger(
            watchMatch[1],
            "The watched process ID",
          );
          if (pid === parentPid || watchedPids.has(pid)) {
            throw new Error("The refresh watchdog watch command is invalid.");
          }
          watchedPids.add(pid);
          process.stdout.write(`watching ${pid}\n`);
        } else {
          const unwatchMatch = command.match(/^unwatch ([1-9][0-9]*)$/u);
          if (unwatchMatch) {
            const pid = parsePositiveInteger(
              unwatchMatch[1],
              "The unwatched process ID",
            );
            if (!watchedPids.delete(pid)) {
              throw new Error(
                "The refresh watchdog unwatch command is invalid.",
              );
            }
            process.stdout.write(`unwatched ${pid}\n`);
          } else if (command === "disarm") {
            if (watchedPids.size > 0 || commandBuffer.length > 0) {
              throw new Error(
                "The refresh watchdog cannot disarm with a watched process.",
              );
            }
            clearTimeout(timeout);
            process.stdout.write("disarmed\n");
            return;
          } else {
            throw new Error("The refresh watchdog command is invalid.");
          }
        }

        commandEnd = commandBuffer.indexOf("\n");
      }
    }

    if (!timedOut) {
      throw new Error("The refresh watchdog was not disarmed correctly.");
    }
  } finally {
    clearTimeout(timeout);
  }
}

function parseArguments(args) {
  if (args.length !== 2) {
    throw new Error("Expected a parent process ID and timeout.");
  }

  return {
    parentPid: parsePositiveInteger(args[0], "The parent process ID"),
    timeoutMilliseconds: parsePositiveInteger(
      args[1],
      "The watchdog timeout",
      MAXIMUM_TIMEOUT_MILLISECONDS,
    ),
  };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  runStorefrontArtifactRefreshWatchdog({
    ...parseArguments(process.argv.slice(2)),
  }).catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
