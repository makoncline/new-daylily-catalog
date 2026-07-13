#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  ATLAS_STORIES,
  projectsForStories,
} from "./agent-atlas-change-map.mjs";
import { ensureAtlasAuth } from "./agent-atlas-auth-state.mjs";
import { atlasProjectsForRuntime } from "./agent-atlas-flows.mjs";

const story = process.argv.slice(2).find((argument) => argument !== "--");
if (!story || !(story in ATLAS_STORIES)) {
  throw new Error(
    `Choose an atlas story: ${Object.keys(ATLAS_STORIES).join(", ")}`,
  );
}
const projects = projectsForStories(
  [story],
  atlasProjectsForRuntime(process.env.HERMETIC_MODE === "1"),
);
const hasMemberProjects = projects.some(
  (project) => !project.startsWith("anonymous-"),
);
if (hasMemberProjects) ensureAtlasAuth();
process.env.AGENT_ATLAS_RUN_STARTED_AT = String(Date.now());
for (const [command, args] of [
  [
    "pnpm",
    [
      "exec",
      "playwright",
      "test",
      "-c",
      "playwright.agent-atlas.config.ts",
      ...projects.map((project) => `--project=${project}`),
      ...(hasMemberProjects ? ["--no-deps"] : []),
    ],
  ],
  ["node", ["scripts/generate-agent-atlas-gallery.mjs"]],
  [
    "node",
    [
      "scripts/agent-atlas-compare.mjs",
      "--stories",
      story,
      "--projects",
      projects.join(","),
    ],
  ],
]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
