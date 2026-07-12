#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  buildAgentLoopPlan,
  formatDuration,
  getAgentLoopServerConfig,
  isExpectedAgentLoopRuntime,
  parseAgentLoopArgs,
} from "./agent-loop-lib.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const atlasRoot = path.join(appRoot, "local", "agent-atlas");
const options = parseAgentLoopArgs(process.argv.slice(2));
const runtimeMode = options.realisticData ? "realistic-data" : "hermetic";
const databasePath = options.realisticData
  ? path.join(appRoot, "local", "realistic-data", "realistic-data.sqlite")
  : path.join(appRoot, "tests", ".tmp", "hermetic-local.sqlite");
const baseURL =
  process.env.AGENT_ATLAS_BASE_URL ??
  (options.realisticData ? "http://localhost:3012" : "http://localhost:3200");
const serverConfig = getAgentLoopServerConfig(baseURL, databasePath);
const atlasEnv = options.realisticData
  ? { AGENT_ATLAS_BASE_URL: baseURL }
  : {
      AGENT_ATLAS_BASE_URL: baseURL,
      AGENT_ATLAS_FORCE_AUTH: "1",
      HERMETIC_MODE: "1",
    };
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

async function probeRuntime() {
  try {
    const response = await fetch(`${baseURL}/api/runtime-config`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return "absent";
    return isExpectedAgentLoopRuntime(await response.json(), {
      mode: runtimeMode,
      databaseId: databasePath,
    })
      ? "match"
      : "incompatible";
  } catch {
    return "absent";
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
        `${runtimeMode} server exited before ${baseURL} became healthy.`,
      );
    }
    const runtime = await probeRuntime();
    if (runtime === "match") return;
    if (runtime === "incompatible") {
      throw new Error(
        `${baseURL} is already serving a different local data runtime. Stop it or choose another AGENT_ATLAS_BASE_URL.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(
    `Local app did not become healthy at ${baseURL} within 120 seconds.`,
  );
}

async function ensureServer() {
  const runtime = await probeRuntime();
  if (runtime === "match") {
    console.log(`Reusing healthy local app at ${baseURL}`);
    return;
  }
  if (runtime === "incompatible") {
    throw new Error(
      `${baseURL} is already serving a different local data runtime. Stop it or choose another AGENT_ATLAS_BASE_URL.`,
    );
  }
  if (options.realisticData && !existsSync(databasePath)) {
    console.log("Realistic database is missing; preparing it now.");
    await run("pnpm", ["realistic-data:prepare"]);
  }
  console.log(`Starting ${runtimeMode} app at ${baseURL}`);
  const command = options.realisticData
    ? ["realistic-data:dev"]
    : ["exec", "tsx", "scripts/run-integration-local.ts"];
  ownedServer = spawn("pnpm", command, {
    cwd: appRoot,
    env: {
      ...process.env,
      LOCAL_QUERY_LOGGING: "0",
      ...(options.realisticData
        ? { REALISTIC_DATA_LOCAL_PORT: serverConfig.port }
        : {
            HERMETIC_DB_NAME: path.basename(databasePath),
            PORT: serverConfig.port,
          }),
    },
    stdio: "inherit",
  });
  ownedServer.on("exit", (code) => {
    if (code && code !== 0)
      console.error(`${runtimeMode} server exited ${code}.`);
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
  console.log(
    "- Serve reports: pnpm exec playwright show-report local/agent-atlas/report",
  );
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
  const needsInitialBaseline = !existsSync(path.join(atlasRoot, "baseline"));
  if (needsInitialBaseline && !options.full && !options.story) {
    console.log(
      "No local atlas reference exists; capturing the full UI atlas once.",
    );
  }
  const planOptions = needsInitialBaseline
    ? { ...options, full: true, story: null }
    : options;
  for (const [command, args] of buildAgentLoopPlan(planOptions)) {
    const usesAtlas = args.some((arg) => arg.includes("atlas"));
    await run(command, args, { env: usesAtlas ? atlasEnv : undefined });
  }
  writeTimingReport("passed");
} catch (error) {
  writeTimingReport("failed", error);
  console.error(`\nAgent loop failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  stopOwnedServer();
}
