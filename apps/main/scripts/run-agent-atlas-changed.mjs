#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  projectsForStories,
  selectAtlasStories,
} from "./agent-atlas-change-map.mjs";
import { ensureAtlasAuth } from "./agent-atlas-auth-state.mjs";
import { atlasProjectsForRuntime } from "./agent-atlas-flows.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? appRoot,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout?.trim() ?? "";
}

const explicitFiles = process.env.AGENT_ATLAS_CHANGED_FILES;
const baseRef = process.env.AGENT_ATLAS_BASE_REF ?? "origin/main";
const committed = explicitFiles
  ? ""
  : run("git", ["diff", "--name-only", `${baseRef}...HEAD`], {
      cwd: repoRoot,
      capture: true,
    });
const tracked = explicitFiles
  ? ""
  : run("git", ["diff", "--name-only", "HEAD"], {
      cwd: repoRoot,
      capture: true,
    });
const untracked = explicitFiles
  ? ""
  : run("git", ["ls-files", "--others", "--exclude-standard"], {
      cwd: repoRoot,
      capture: true,
    });
const files = [
  ...new Set(
    (explicitFiles ?? `${committed}\n${tracked}\n${untracked}`)
      .split(/[\n,]/)
      .map((file) => file.trim())
      .filter(Boolean),
  ),
];
const stories = selectAtlasStories(files);

if (stories.length === 0) {
  console.log("No application changes map to the UI atlas.");
  process.exit(0);
}

const projects = projectsForStories(
  stories,
  atlasProjectsForRuntime(process.env.HERMETIC_MODE === "1"),
);
console.log(`Changed files select atlas stories: ${stories.join(", ")}`);
process.env.AGENT_ATLAS_RUN_STARTED_AT = String(Date.now());
const args = [
  "exec",
  "playwright",
  "test",
  "-c",
  "playwright.agent-atlas.config.ts",
];
if (projects.some((project) => !project.startsWith("anonymous-"))) {
  ensureAtlasAuth();
  args.push("--no-deps");
}
args.push(...projects.map((project) => `--project=${project}`));
run("pnpm", args);
run("node", ["scripts/generate-agent-atlas-gallery.mjs"]);
run(
  "node",
  [
    "scripts/agent-atlas-compare.mjs",
    ...(stories.includes("all") ? [] : ["--stories", stories.join(",")]),
    "--projects",
    projects.join(","),
  ],
);
