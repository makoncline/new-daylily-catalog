#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

if (process.pid === 1 || process.ppid !== 1) {
  throw new Error("The app process must be a child of the container init.");
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const watchdogPath = path.resolve(
  scriptDirectory,
  "../../scripts/storefront-artifact-refresh-watchdog.mjs",
);
const watchdog = spawn(
  process.execPath,
  [watchdogPath, String(process.pid), "500"],
  {
    detached: true,
    stdio: ["pipe", "pipe", "inherit"],
  },
);
watchdog.stdout.setEncoding("utf8");
const lines = createInterface({ input: watchdog.stdout, crlfDelay: Infinity });
const ready = await lines[Symbol.asyncIterator]().next();
if (ready.done || ready.value !== "ready") {
  throw new Error("The refresh watchdog did not become ready.");
}

process.stdout.write(
  `watchdog-container-ready|nodePid=${process.pid}|parentPid=${process.ppid}\n`,
);
setInterval(() => undefined, 60_000);
