#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(appRoot, "../..");

const args = [...process.argv.slice(2)];
let explicitEnvName = null;

if (args[0] === "--env") {
  explicitEnvName = args[1] ?? null;
  args.splice(0, 2);
}

if (args[0] === "--") {
  args.shift();
}

const envName =
  explicitEnvName ??
  (process.env.NODE_ENV === "production" ? "production" : "development");
const envFile = `.env.${envName}`;

for (const envPath of [
  path.join(repoRoot, envFile),
  path.join(appRoot, envFile),
]) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, quiet: true });
  }
}

if (args.length === 0) {
  process.exit(0);
}

const child = spawn(args[0], args.slice(1), {
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
