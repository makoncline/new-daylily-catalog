#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  e2eCiGroups,
  getE2eCiGroup,
  validateE2eCiGroups,
} from "./e2e-ci-groups.mjs";

const [groupArgument, ...playwrightArguments] = process.argv.slice(2);
const group = getE2eCiGroup(groupArgument ?? "");
const appRoot = path.resolve(import.meta.dirname, "..");
validateE2eCiGroups({ appRoot });

const result = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["exec", "playwright", "test", ...e2eCiGroups[group], ...playwrightArguments],
  { cwd: appRoot, env: process.env, stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
