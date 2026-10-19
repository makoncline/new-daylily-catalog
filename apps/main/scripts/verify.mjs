#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { confidenceCommandsForFlow, getAtlasFlow } from "./atlas-flows.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

/** @param {string[]} args */
export function verificationCommands(args) {
  if (args[0] === "--flow" && args.length === 2) {
    return confidenceCommandsForFlow(getAtlasFlow(args[1]))
      .filter((command) => command !== null)
      .map((command) => ({
        command: "sh",
        args: ["-c", command],
        display: command,
      }));
  }

  const full = args.length === 1 && args[0] === "--full";
  const focused = args[0] === "--tests" && args.length > 1;
  if (args.length && !full && !focused) {
    throw new Error(
      "Usage: pnpm verify [--full | --tests <Vitest path...> | --flow <Atlas ID>]",
    );
  }

  const commands = [
    { command: pnpm, args: ["lint"], display: "pnpm lint" },
    { command: pnpm, args: ["typecheck"], display: "pnpm typecheck" },
    focused
      ? {
          command: pnpm,
          args: ["main", "exec", "vitest", "run", ...args.slice(1)],
          display: `pnpm main exec vitest run ${args.slice(1).join(" ")}`,
        }
      : { command: pnpm, args: ["test"], display: "pnpm test" },
  ];
  if (full) {
    commands.push({
      command: process.execPath,
      args: ["apps/main/scripts/run-integration-local.mjs"],
      display: "node apps/main/scripts/run-integration-local.mjs",
    });
  }
  return commands;
}

/**
 * @typedef {{status: number | null, signal?: string | null, error?: Error}} CommandResult
 * @typedef {(command: string, args: string[], options: import('node:child_process').SpawnSyncOptions) => CommandResult} CommandRunner
 * @param {ReturnType<typeof verificationCommands>} commands
 * @param {CommandRunner} [run]
 */
export function runVerification(commands, run = spawnSync) {
  for (const entry of commands) {
    console.log(`\n> ${entry.display}`);
    const result = run(entry.command, entry.args, {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      if (result.signal)
        console.error(`${entry.display} stopped: ${result.signal}`);
      return result.status ?? 1;
    }
  }
  return 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    process.exitCode = runVerification(
      verificationCommands(process.argv.slice(2)),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
