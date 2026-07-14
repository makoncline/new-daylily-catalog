#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { ensureAtlasAuth } from "./agent-atlas-auth-state.mjs";
import { atlasProjectsForRuntime } from "./agent-atlas-flows.mjs";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

process.env.AGENT_ATLAS_RUN_STARTED_AT = String(Date.now());
const append = process.env.AGENT_ATLAS_APPEND === "1";
if (!append) {
  run("node", ["scripts/generate-agent-atlas-gallery.mjs", "--clean"]);
}
ensureAtlasAuth();
const projects = atlasProjectsForRuntime(
  process.env.HERMETIC_MODE === "1",
  append,
);
run("pnpm", [
  "exec",
  "playwright",
  "test",
  "-c",
  "playwright.agent-atlas.config.ts",
  "--no-deps",
  ...projects.map((project) => `--project=${project}`),
]);
run("node", ["scripts/generate-agent-atlas-gallery.mjs"]);
