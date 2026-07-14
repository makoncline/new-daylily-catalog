#!/usr/bin/env node

import path from "node:path";
import { approveAtlasBaseline } from "./agent-atlas-baseline-state.mjs";
import { getAtlasRoot } from "./agent-atlas-paths.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const atlasRoot = getAtlasRoot(appRoot);
const captures = path.join(atlasRoot, "gallery-captures");
const baseline = path.join(atlasRoot, "baseline");

const count = approveAtlasBaseline(captures, baseline, {
  comparisonPath: path.join(atlasRoot, "report", "comparison.json"),
});
console.log(`Approved ${count} atlas screenshots as the local baseline.`);
