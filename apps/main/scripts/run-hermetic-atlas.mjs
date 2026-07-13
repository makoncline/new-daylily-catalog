#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { isExpectedAgentLoopRuntime } from "./agent-loop-lib.mjs";

const port = process.env.HERMETIC_PORT ?? "3200";
const baseURL = `http://localhost:${port}`;
const databaseName =
  process.env.HERMETIC_DB_NAME ??
  `hermetic-atlas-${process.pid}-${Date.now()}.sqlite`;
const databasePath = path.resolve(process.cwd(), "tests", ".tmp", databaseName);
const env = {
  ...process.env,
  PORT: port,
  HERMETIC_DB_NAME: databaseName,
  HERMETIC_MODE: "1",
  AGENT_ATLAS_RUNTIME: "hermetic",
  AGENT_ATLAS_BASE_URL: baseURL,
  AGENT_ATLAS_FORCE_AUTH: "1",
  AGENT_ATLAS_APPEND: process.env.AGENT_ATLAS_APPEND ?? "0",
  AGENT_ATLAS_AUTH_RUNTIME: "hermetic",
};

const server = spawn(process.execPath, ["scripts/run-hermetic-local.ts"], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error(
        server.signalCode
          ? `Hermetic server stopped with ${server.signalCode}.`
          : `Hermetic server exited with ${server.exitCode}.`,
      );
    }
    let response;
    try {
      response = await fetch(`${baseURL}/api/runtime-config`);
    } catch {}
    if (response?.ok) {
      const payload = await response.json();
      if (
        isExpectedAgentLoopRuntime(payload, {
          mode: "hermetic",
          databaseId: databasePath,
        })
      ) {
        return;
      }
      throw new Error(
        `${baseURL} is serving a different local data runtime. Stop it or choose another HERMETIC_PORT.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the hermetic server.");
}

try {
  await waitForServer();
  const result = spawnSync("node", ["scripts/run-agent-atlas-full.mjs"], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  server.kill("SIGTERM");
}
