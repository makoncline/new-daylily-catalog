#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  buildAgentLoopPlan,
  formatDuration,
  parseAgentLoopArgs,
} from "./agent-loop-lib.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const atlasRoot = path.join(appRoot, "local", "agent-atlas");
const databasePath = path.join(
  appRoot,
  "local",
  "realistic-data",
  "realistic-data.sqlite",
);
const baseURL = process.env.AGENT_ATLAS_BASE_URL ?? "http://localhost:3012";
const options = parseAgentLoopArgs(process.argv.slice(2));
const timings = [];
let ownedServer = null;

function run(command, args, runOptions = {}) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: appRoot,
      env: { ...process.env, ...runOptions.env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      const durationMs = Date.now() - startedAt;
      timings.push({
        command: `${command} ${args.join(" ")}`,
        durationMs,
        code: code ?? 1,
      });
      if (code === 0) resolve();
      else
        reject(
          new Error(
            signal
              ? `${command} stopped by ${signal}`
              : `${command} exited ${code}`,
          ),
        );
    });
  });
}

async function healthy() {
  try {
    const response = await fetch(`${baseURL}/api/runtime-config`, {
      signal: AbortSignal.timeout(5_000),
    });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForHealth() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (
      ownedServer &&
      (ownedServer.exitCode !== null || ownedServer.signalCode !== null)
    ) {
      throw new Error(
        `Realistic-data server exited before ${baseURL} became healthy.`,
      );
    }
    if (await healthy()) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(
    `Local app did not become healthy at ${baseURL} within 120 seconds.`,
  );
}

async function ensureServer() {
  if (await healthy()) {
    console.log(`Reusing healthy local app at ${baseURL}`);
    return;
  }
  if (!existsSync(databasePath)) {
    console.log("Realistic database is missing; preparing it now.");
    await run("pnpm", ["realistic-data:prepare"]);
  }
  console.log(`Starting realistic-data app at ${baseURL}`);
  ownedServer = spawn("pnpm", ["realistic-data:dev"], {
    cwd: appRoot,
    env: { ...process.env, LOCAL_QUERY_LOGGING: "0" },
    stdio: "inherit",
  });
  ownedServer.on("exit", (code) => {
    if (code && code !== 0)
      console.error(`Realistic-data server exited ${code}.`);
  });
  await waitForHealth();
}

function stopOwnedServer() {
  if (ownedServer && !options.keepServer) ownedServer.kill("SIGTERM");
}

function writeTimingReport(status, error) {
  mkdirSync(path.join(atlasRoot, "report"), { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    status,
    baseURL,
    selection: options.full ? "full" : (options.story ?? "changed-files"),
    timings,
    totalDurationMs: timings.reduce(
      (total, item) => total + item.durationMs,
      0,
    ),
    error: error?.message ?? null,
  };
  writeFileSync(
    path.join(atlasRoot, "report", "agent-loop.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log("\nAgent loop summary");
  for (const item of timings)
    console.log(
      `- ${item.command}: ${formatDuration(item.durationMs)} (exit ${item.code})`,
    );
  console.log(`- Gallery: ${baseURL.replace(/:\d+$/, ":9323")}/gallery.html`);
  console.log(
    `- Visual review: ${baseURL.replace(/:\d+$/, ":9323")}/visual-review.html`,
  );
  console.log(
    `- Timing data: ${path.join(atlasRoot, "report", "agent-loop.json")}`,
  );
  console.log("- Serve reports: pnpm agent:report");
}

process.on("SIGINT", () => {
  stopOwnedServer();
  process.exit(130);
});
process.on("SIGTERM", () => {
  stopOwnedServer();
  process.exit(143);
});

try {
  await ensureServer();
  for (const [command, args] of buildAgentLoopPlan(options))
    await run(command, args);
  writeTimingReport("passed");
} catch (error) {
  writeTimingReport("failed", error);
  console.error(`\nAgent loop failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  stopOwnedServer();
}
