import fs from "node:fs";
import path from "node:path";

import { REVIEW_ROOT } from "./review-db.mjs";

const LOCK_PATH = path.join(REVIEW_ROOT, "codex-native-worker.lock");
const COMMAND_PATH = path.join(REVIEW_ROOT, "codex-native-worker-command.json");
const STATE_PATH = path.join(REVIEW_ROOT, "codex-native-worker-state.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readWorker() {
  if (!fs.existsSync(LOCK_PATH)) {
    throw new Error("No Codex-native image worker is running.");
  }

  const lock = readJson(LOCK_PATH);
  try {
    process.kill(lock.pid, 0);
  } catch {
    throw new Error(`Worker lock is stale: ${LOCK_PATH}`);
  }
  return lock;
}

function writeCommand(command) {
  const worker = readWorker();
  const temporaryPath = `${COMMAND_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(
    temporaryPath,
    `${JSON.stringify({ ...command, runId: worker.runId }, null, 2)}\n`,
  );
  fs.renameSync(temporaryPath, COMMAND_PATH);
}

const [command, value] = process.argv.slice(2).filter((arg) => arg !== "--");

if (command === "status") {
  const worker = readWorker();
  const state = fs.existsSync(STATE_PATH) ? readJson(STATE_PATH) : null;
  console.log(JSON.stringify({ state, worker }, null, 2));
} else if (command === "drain") {
  writeCommand({ command: "drain" });
  console.log("Drain requested. Active generations will finish before exit.");
} else if (command === "concurrency") {
  const concurrency = Number(value);
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Pass a positive integer: images:control concurrency <n>");
  }
  writeCommand({ command: "concurrency", value: concurrency });
  console.log(`Concurrency change requested: ${concurrency}`);
} else {
  throw new Error("Use: images:control status | concurrency <n> | drain");
}
