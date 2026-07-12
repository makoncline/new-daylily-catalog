#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";

const port = process.env.HERMETIC_PORT ?? "3200";
const baseURL = `http://localhost:${port}`;
const env = {
  ...process.env,
  PORT: port,
  HERMETIC_MODE: "1",
  AGENT_ATLAS_BASE_URL: baseURL,
  AGENT_ATLAS_FORCE_AUTH: "1",
};

const server = spawn("pnpm", ["exec", "tsx", "scripts/run-hermetic-local.ts"], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Hermetic server exited with ${server.exitCode}.`);
    }
    try {
      const response = await fetch(`${baseURL}/api/runtime-config`);
      if (response.ok) return;
    } catch {}
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
