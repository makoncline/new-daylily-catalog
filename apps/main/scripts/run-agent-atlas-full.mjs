#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { ensureAtlasAuth } from "./agent-atlas-auth-state.mjs";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("node", ["scripts/generate-agent-atlas-gallery.mjs", "--clean"]);
ensureAtlasAuth();
run("pnpm", [
  "exec",
  "playwright",
  "test",
  "-c",
  "playwright.agent-atlas.config.ts",
  "--no-deps",
  "--project=anonymous-desktop",
  "--project=anonymous-mobile",
  "--project=rolling-oaks",
  "--project=plant-fancy-gardens",
]);
run("node", ["scripts/generate-agent-atlas-gallery.mjs"]);
