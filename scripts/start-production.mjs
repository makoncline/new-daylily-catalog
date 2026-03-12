#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const args = process.argv.slice(2);
const standaloneServer = path.join(rootDir, ".next", "standalone", "server.js");
const nextBin = path.join(rootDir, "node_modules", ".bin", "next");

const useStandalone = fs.existsSync(standaloneServer);
const command = useStandalone ? process.execPath : nextBin;
const commandArgs = useStandalone
  ? [standaloneServer, ...args]
  : ["start", ...args];

if (!useStandalone && !fs.existsSync(nextBin)) {
  console.error("Error: next binary not found (deps not installed?)");
  process.exit(1);
}

const child = spawn(command, commandArgs, {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
