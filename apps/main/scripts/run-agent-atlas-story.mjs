#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { ATLAS_STORIES } from "./agent-atlas-change-map.mjs";

const story = process.argv.slice(2).find((argument) => argument !== "--");
if (!story || !(story in ATLAS_STORIES)) {
  throw new Error(
    `Choose an atlas story: ${Object.keys(ATLAS_STORIES).join(", ")}`,
  );
}
const grep = ATLAS_STORIES[story].grep;
for (const [command, args] of [
  [
    "pnpm",
    [
      "exec",
      "playwright",
      "test",
      "-c",
      "playwright.agent-atlas.config.ts",
      "--grep",
      grep,
    ],
  ],
  ["node", ["scripts/generate-agent-atlas-gallery.mjs"]],
  ["node", ["scripts/agent-atlas-compare.mjs"]],
]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
