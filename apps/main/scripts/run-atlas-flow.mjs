#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
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
import {
  assertRealisticDataSeedFresh,
  createDisposableRealisticDataSnapshot,
  resolveRealisticDataOutputPath,
} from "./realistic-data-snapshot.mjs";
import { assertNoUnexpectedBrowserDiagnostics } from "./atlas-browser-diagnostics.mjs";
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
const finalServerLogPath = path.join(outputDirectory, "server.log");
let serverLogPath = path.join(
  path.dirname(outputDirectory),
  `.${path.basename(outputDirectory)}-server-${process.pid}.log`,
);
const baseURL =
  process.env.BASE_URL ??
  `http://localhost:${process.env.ATLAS_PORT ?? "3210"}`;
const explicitDatabaseUrl = process.env.DATABASE_URL;
const normalizeDatabaseUrl = (databaseUrl) =>
  databaseUrl?.startsWith("file:")
    ? new URL(databaseUrl, pathToFileURL(`${appRoot}${path.sep}`)).href
    : databaseUrl;
let disposableDatabase;
let atlasDatabaseUrl = normalizeDatabaseUrl(
  process.env.ATLAS_DATABASE_URL ?? explicitDatabaseUrl,
);
const runtimeFlagsPath = path.join(
  tmpdir(),
  `daylily-atlas-feature-flags-${process.pid}.json`,
);
let server;
let serverLogFd;
const stopServer = async () => {
  if (!server?.pid || server.exitCode !== null || server.signalCode !== null)
    return;
  const activeServer = server;
  const exited = new Promise((resolve) => activeServer.once("exit", resolve));
  try {
    process.kill(
      process.platform === "win32" ? activeServer.pid : -activeServer.pid,
      "SIGTERM",
    );
  } catch {
    // The process group already exited.
  }
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (activeServer.exitCode === null && activeServer.signalCode === null) {
    try {
      process.kill(
        process.platform === "win32" ? activeServer.pid : -activeServer.pid,
        "SIGKILL",
      );
    } catch {
      // The process group exited between checks.
    }
    await exited;
  }
};
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    void stopServer().finally(() => {
      disposableDatabase?.cleanup();
      rmSync(runtimeFlagsPath, { force: true });
      process.exit(signal === "SIGINT" ? 130 : 143);
    });
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
  if (await isHealthy()) {
    if (process.env.BASE_URL) return;
    throw new Error(
      `${baseURL} is already serving an app. Stop it or pass BASE_URL explicitly to reuse it.`,
    );
  }
  if (process.env.BASE_URL)
    throw new Error(`BASE_URL is not healthy: ${process.env.BASE_URL}`);
  for (const envPath of [
    path.join(repoRoot, ".env.development"),
    path.join(appRoot, ".env.development"),
  ]) {
    if (existsSync(envPath)) dotenv.config({ path: envPath, quiet: true });
  }
  let databaseUrl = normalizeDatabaseUrl(explicitDatabaseUrl);
  if (!databaseUrl) {
    const manifest = assertRealisticDataSeedFresh({
      manifestPath: path.join(appRoot, "local/realistic-data/personas.json"),
      schemaPath: path.join(appRoot, "prisma/schema.prisma"),
    });
    const seededDatabase = resolveRealisticDataOutputPath({
      appRoot,
      configuredPath: manifest.databasePath,
    });
    if (!existsSync(seededDatabase))
      throw new Error(
        "Seeded database missing. Run `pnpm db:seed:prepare` first.",
      );
    disposableDatabase = await createDisposableRealisticDataSnapshot({
      sourcePath: seededDatabase,
    });
    databaseUrl = `file:${disposableDatabase.databasePath}`;
  }
  atlasDatabaseUrl = databaseUrl;
  serverLogFd = openSync(serverLogPath, "w");
  writeFileSync(runtimeFlagsPath, '{"publicCultivarSearch":true}');
  server = spawn("pnpm", ["dev", "--", "--port", new URL(baseURL).port], {
    cwd: repoRoot,
    detached: process.platform !== "win32",
    stdio: ["ignore", serverLogFd, serverLogFd],
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NEXT_PUBLIC_POSTHOG_KEY: "",
      NEXT_PUBLIC_SENTRY_ENABLED: "false",
      PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS: "0",
      RUNTIME_FEATURE_FLAGS_PATH: runtimeFlagsPath,
      TURSO_DATABASE_AUTH_TOKEN: "",
      TURSO_EMBEDDED_REPLICA_URL: "",
      TURSO_EMBEDDED_REPLICA_SYNC_URL: "",
    },
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error(`Atlas dev server exited early. See ${serverLogPath}.`);
    if (await isHealthy()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `Atlas dev server was not ready at ${baseURL}. See ${serverLogPath}.`,
  );
}
try {
  mkdirSync(path.dirname(outputDirectory), { recursive: true });
  await startServer();
  if (flows.some((flow) => flow.id === "dashboard-home") && !atlasDatabaseUrl) {
    throw new Error(
      "Dashboard home Atlas states need ATLAS_DATABASE_URL when BASE_URL reuses an existing server.",
    );
  }
  rmSync(outputDirectory, { recursive: true, force: true });
  mkdirSync(outputDirectory, { recursive: true });
  if (serverLogFd !== undefined) {
    renameSync(serverLogPath, finalServerLogPath);
    serverLogPath = finalServerLogPath;
  }
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
          ATLAS_DATABASE_URL: atlasDatabaseUrl,
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
    if (serverLogFd !== undefined) {
      assertNoUnexpectedBrowserDiagnostics(readFileSync(serverLogPath, "utf8"));
    }
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
  if (serverLogFd !== undefined)
    console.log(`Atlas server log: ${serverLogPath}`);
} finally {
  await stopServer();
  if (serverLogFd !== undefined) closeSync(serverLogFd);
  disposableDatabase?.cleanup();
  rmSync(runtimeFlagsPath, { force: true });
}
