#!/usr/bin/env node

import path from "node:path";
import { approveAtlasBaseline } from "./agent-atlas-baseline-state.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const atlasRoot = path.join(appRoot, "local", "agent-atlas");
const captures = path.join(atlasRoot, "gallery-captures");
const baseline = path.join(atlasRoot, "baseline");

const count = approveAtlasBaseline(captures, baseline);
console.log(`Approved ${count} atlas screenshots as the local baseline.`);
