#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const appRoot = path.resolve(import.meta.dirname, "..");
const atlasRoot = path.join(appRoot, "local", "agent-atlas");
const captures = path.join(atlasRoot, "gallery-captures");
const baseline = path.join(atlasRoot, "baseline");

if (!existsSync(captures)) {
  throw new Error("No atlas captures found. Run pnpm agent:capture first.");
}

rmSync(baseline, { recursive: true, force: true });
mkdirSync(baseline, { recursive: true });
cpSync(captures, baseline, { recursive: true });
const count = readdirSync(baseline).filter((file) =>
  file.endsWith(".png"),
).length;
writeFileSync(
  path.join(baseline, "baseline.json"),
  `${JSON.stringify({ version: 1, approvedAt: new Date().toISOString(), count }, null, 2)}\n`,
);
console.log(`Approved ${count} atlas screenshots as the local baseline.`);
