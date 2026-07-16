#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";
import {
  generateAtlasGallery,
  generateAtlasHome,
} from "./generate-atlas-gallery.mjs";
import {
  ATLAS_FLOWS,
  getAtlasFlow,
  missingFreshStateIds,
  validateAtlasFlows,
} from "./atlas-flows.mjs";
const ATLAS_HEALTH_PATH = "/api/runtime-config";
const appRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");
const [requestedFlowId, outputArgument, ...unexpected] = process.argv.slice(2);
if (
  !requestedFlowId ||
  !outputArgument?.startsWith("--output=") ||
  unexpected.length
)
  throw new Error("Usage: run-atlas-flow.mjs <flow-id> --output=<directory>");

const flows =
  requestedFlowId === "all" ? ATLAS_FLOWS : [getAtlasFlow(requestedFlowId)];
validateAtlasFlows({ appRoot });
const outputDirectory = path.resolve(process.cwd(), outputArgument.slice(9));
const baseURL = process.env.BASE_URL ?? "http://localhost:3210";
const explicitDatabaseUrl = process.env.DATABASE_URL;
let server;
const stopServer = () => {
  if (!server?.pid) return;
  try {
    process.kill(
      process.platform === "win32" ? server.pid : -server.pid,
      "SIGTERM",
    );
  } catch {
    // The process group already exited.
  }
};
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
    return response.ok;
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
  for (const flow of flows) {
    const flowOutputDirectory =
      flows.length === 1
        ? outputDirectory
        : path.join(outputDirectory, flow.id);
    const captureDirectory = path.join(flowOutputDirectory, "screenshots");
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
          ATLAS_OUTPUT_DIR: flowOutputDirectory,
          ATLAS_CAPTURE_DIR: captureDirectory,
          ATLAS_AUTH_STATE: path.join(flowOutputDirectory, ".auth/member.json"),
          ATLAS_PLAYWRIGHT_RESULTS_DIR: path.join(
            flowOutputDirectory,
            "playwright-results",
          ),
          ATLAS_PLAYWRIGHT_REPORT_DIR: path.join(
            flowOutputDirectory,
            "playwright-report",
          ),
        },
      },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      break;
    }
    const missing = missingFreshStateIds(flow, captureDirectory, startedAt);
    if (missing.length)
      throw new Error(`Missing or stale Atlas states: ${missing.join(", ")}`);
    const galleryPath = generateAtlasGallery({
      flowId: flow.id,
      outputDirectory: flowOutputDirectory,
      baseURL,
    });
    console.log(`Atlas gallery: ${path.resolve(galleryPath)}`);
  }
  if (flows.length > 1 && !process.exitCode)
    console.log(
      `Atlas home: ${path.resolve(generateAtlasHome({ outputDirectory, flows }))}`,
    );
} finally {
  stopServer();
}
