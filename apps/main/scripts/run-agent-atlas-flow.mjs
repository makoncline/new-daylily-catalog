#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { ensureAtlasAuth } from "./agent-atlas-auth-state.mjs";
import {
  atlasProjectsForRuntime,
  normalizedCaptureName,
  selectAtlasFlowRun,
} from "./agent-atlas-flows.mjs";
import { getAtlasRoot } from "./agent-atlas-paths.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const testRoot = path.join(appRoot, "tests", "agent-atlas");
const captureRoot = path.join(getAtlasRoot(appRoot), "gallery-captures");
const flowId = process.argv.slice(2).find((argument) => argument !== "--");

if (!flowId) throw new Error("Provide an Atlas flow id.");

const testSources = readdirSync(testRoot)
  .filter((file) => file.endsWith(".atlas.ts"))
  .map((file) => ({
    file,
    source: readFileSync(path.join(testRoot, file), "utf8"),
  }));
const captures = existsSync(captureRoot)
  ? readdirSync(captureRoot)
      .filter((file) => file.endsWith(".json"))
      .map((file) =>
        JSON.parse(readFileSync(path.join(captureRoot, file), "utf8")),
      )
  : [];
const selection = selectAtlasFlowRun(flowId, captures, testSources);
const hermetic = process.env.HERMETIC_MODE === "1";
const runtimeProjects = atlasProjectsForRuntime(hermetic);
const projects = selection.projects.length
  ? runtimeProjects.filter((project) => selection.projects.includes(project))
  : runtimeProjects;

if (selection.files.length === 0 || projects.length === 0) {
  throw new Error(
    `Flow ${flowId} has no captures compatible with the current Atlas runtime.`,
  );
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (projects.some((project) => !project.startsWith("anonymous-")))
  ensureAtlasAuth();
process.env.AGENT_ATLAS_RUN_STARTED_AT = String(Date.now());
const runStartedAt = Number(process.env.AGENT_ATLAS_RUN_STARTED_AT);
const captureNames = selection.captureNames.join(",");
console.log(
  `Refreshing ${selection.flow.title}: ${selection.files.length} specs, ${projects.length} projects, ${selection.captureNames.length} states.`,
);
run(
  "pnpm",
  [
    "exec",
    "playwright",
    "test",
    "-c",
    "playwright.agent-atlas.config.ts",
    ...selection.files.map((file) => `tests/agent-atlas/${file}`),
    "--no-deps",
    ...projects.map((project) => `--project=${project}`),
  ],
  { env: { AGENT_ATLAS_CAPTURE_NAMES: captureNames } },
);
const freshCaptureCount = existsSync(captureRoot)
  ? readdirSync(captureRoot)
      .filter((file) => file.endsWith(".json"))
      .filter(
        (file) =>
          statSync(path.join(captureRoot, file)).mtimeMs >= runStartedAt,
      )
      .map((file) =>
        JSON.parse(readFileSync(path.join(captureRoot, file), "utf8")),
      )
      .filter((capture) => projects.includes(capture.project))
      .filter((capture) =>
        selection.captureNames.includes(normalizedCaptureName(capture)),
      ).length
  : 0;
if (freshCaptureCount === 0) {
  throw new Error(
    `Flow ${flowId} produced no captures in the ${hermetic ? "hermetic" : "connected"} runtime.`,
  );
}
run("node", ["scripts/generate-agent-atlas-gallery.mjs"]);
run("node", [
  "scripts/agent-atlas-compare.mjs",
  "--captures",
  captureNames,
  "--projects",
  projects.join(","),
]);
