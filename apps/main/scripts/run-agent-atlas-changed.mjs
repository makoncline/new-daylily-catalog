#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { grepForStories, selectAtlasStories } from "./agent-atlas-change-map.mjs";

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
  if (result.status !== 0 && !options.allowFailure) process.exit(result.status ?? 1);
  return result.stdout?.trim() ?? "";
}

const explicitFiles = process.env.AGENT_ATLAS_CHANGED_FILES;
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
    (explicitFiles ?? `${tracked}\n${untracked}`)
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

const grep = grepForStories(stories);
console.log(`Changed files select atlas stories: ${stories.join(", ")}`);
const args = ["exec", "playwright", "test", "-c", "playwright.agent-atlas.config.ts"];
if (grep) args.push("--grep", grep);
run("pnpm", args);
run("node", ["scripts/generate-agent-atlas-gallery.mjs"]);
run("node", ["scripts/agent-atlas-compare.mjs"], { allowFailure: process.env.AGENT_ATLAS_ALLOW_CHANGES === "1" });
