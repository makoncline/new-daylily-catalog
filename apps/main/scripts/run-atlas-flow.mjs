#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";
import { generateAtlasGallery } from "./generate-atlas-gallery.mjs";
import {
  ATLAS_HEALTH_PATH,
  terminateAtlasServer,
} from "./atlas-server-process.mjs";
import {
  getAtlasFlow,
  missingFreshStateIds,
  validateAtlasFlows,
} from "./atlas-flows.mjs";
const appRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");
const [flowId, outputArgument, ...unexpected] = process.argv.slice(2);
if (!flowId || !outputArgument?.startsWith("--output=") || unexpected.length)
  throw new Error("Usage: run-atlas-flow.mjs <flow-id> --output=<directory>");

const flow = getAtlasFlow(flowId);
validateAtlasFlows({ appRoot });
const outputDirectory = path.resolve(process.cwd(), outputArgument.slice(9));
const captureDirectory = path.join(outputDirectory, "screenshots");
const baseURL = process.env.BASE_URL ?? "http://localhost:3210";
const explicitDatabaseUrl = process.env.DATABASE_URL;
let server;
const stopServer = () => terminateAtlasServer(server);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopServer();
    process.exit(signal === "SIGINT" ? 130 : 143);
  });
}
async function isHealthy() {
  try {
    const response = await fetch(new URL(ATLAS_HEALTH_PATH, baseURL), {
      signal: AbortSignal.timeout(5_000),
    });
    return response.status < 500;
  } catch {
    return false;
  }
}
async function startServer() {
  if (await isHealthy()) return;
  if (process.env.BASE_URL)
    throw new Error(`BASE_URL is not healthy: ${process.env.BASE_URL}`);
  for (const envPath of [
    path.join(repoRoot, ".env.development"),
    path.join(appRoot, ".env.development"),
  ]) {
    if (existsSync(envPath)) dotenv.config({ path: envPath, quiet: true });
  }
  const seededDatabase = path.join(
    appRoot,
    "local/realistic-data/realistic-data.sqlite",
  );
  if (!explicitDatabaseUrl && !existsSync(seededDatabase))
    throw new Error(
      "Seeded database missing. Run `pnpm db:seed:prepare` first.",
    );
  server = spawn("pnpm", ["dev", "--", "--port", new URL(baseURL).port], {
    cwd: repoRoot,
    detached: process.platform !== "win32",
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: explicitDatabaseUrl ?? `file:${seededDatabase}`,
      PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS: "0",
      TURSO_DATABASE_AUTH_TOKEN: "",
      TURSO_EMBEDDED_REPLICA_URL: "",
      TURSO_EMBEDDED_REPLICA_SYNC_URL: "",
    },
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error("Atlas dev server exited early.");
    if (await isHealthy()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Atlas dev server was not ready at ${baseURL}`);
}
try {
  await startServer();
  rmSync(outputDirectory, { recursive: true, force: true });
  mkdirSync(captureDirectory, { recursive: true });
  const startedAt = Date.now();
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "playwright",
      "test",
      "-c",
      "playwright.atlas.config.ts",
      flow.steps[0].states[0].captureSpec,
    ],
    {
      cwd: appRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        BASE_URL: baseURL,
        ATLAS_OUTPUT_DIR: outputDirectory,
        ATLAS_CAPTURE_DIR: captureDirectory,
        ATLAS_AUTH_STATE: path.join(outputDirectory, ".auth/member.json"),
        ATLAS_PLAYWRIGHT_RESULTS_DIR: path.join(
          outputDirectory,
          "playwright-results",
        ),
        ATLAS_PLAYWRIGHT_REPORT_DIR: path.join(
          outputDirectory,
          "playwright-report",
        ),
      },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else {
    const missing = missingFreshStateIds(flow, captureDirectory, startedAt);
    if (missing.length)
      throw new Error(`Missing or stale Atlas states: ${missing.join(", ")}`);
    const galleryPath = generateAtlasGallery({
      flowId,
      outputDirectory,
      baseURL,
    });
    console.log(`Atlas gallery: ${path.resolve(galleryPath)}`);
  }
} finally {
  stopServer();
}
