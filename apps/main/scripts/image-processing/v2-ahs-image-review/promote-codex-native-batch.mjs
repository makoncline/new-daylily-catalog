import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  REVIEW_DB_PATH,
  REVIEW_EDITED_DIR,
  REVIEW_ROOT,
  ensureSchema,
  openQueueDb,
  updateStatus,
} from "./review-db.mjs";

const PROMPT_VERSION = "codex-native-imagegen-v1-square";
const GENERATED_IMAGES_ROOT = path.join(
  os.homedir(),
  ".codex",
  "generated_images",
);
const CANDIDATES_DIR = path.join(REVIEW_ROOT, "codex-native-candidates");

function getAllArgs(name) {
  const values = [];

  for (let index = 0; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const prefix = `${name}=`;

    if (arg.startsWith(prefix)) {
      values.push(arg.slice(prefix.length));
    } else if (arg === name && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
      index += 1;
    }
  }

  return values;
}

function printUsage() {
  console.error(
    [
      "Usage:",
      "  pnpm main exec node scripts/image-processing/v2-ahs-image-review/promote-codex-native-batch.mjs --pair <queue-id>=<subagent-id> [--pair <queue-id>=<subagent-id> ...]",
      "",
      "Example:",
      "  pnpm main exec node scripts/image-processing/v2-ahs-image-review/promote-codex-native-batch.mjs --pair cr-ahs-123=019... --pair cr-ahs-456=019...",
    ].join("\n"),
  );
}

function findNewestPng(agentId) {
  const agentDir = path.join(GENERATED_IMAGES_ROOT, agentId);

  if (!fs.existsSync(agentDir)) {
    return { error: `Generated image directory does not exist: ${agentDir}` };
  }

  const pngPaths = fs
    .readdirSync(agentDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
    .map((entry) => path.join(agentDir, entry.name))
    .sort(
      (left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs,
    );

  if (!pngPaths[0]) {
    return { error: `No generated PNG found in: ${agentDir}` };
  }

  return { path: pngPaths[0] };
}

function readRow(id) {
  const database = openQueueDb();

  try {
    ensureSchema(database);
    return database
      .prepare(
        `
          SELECT "id", "postTitle", "status", "originalPath", "editedPath", "promptVersion"
          FROM "v2_image_review_queue"
          WHERE "id" = ?
        `,
      )
      .get(id);
  } finally {
    database.close();
  }
}

function getCounts() {
  const database = openQueueDb();

  try {
    ensureSchema(database);
    return database
      .prepare(
        `
          SELECT "status", COUNT(*) AS "count"
          FROM "v2_image_review_queue"
          GROUP BY "status"
          ORDER BY "status"
        `,
      )
      .all();
  } finally {
    database.close();
  }
}

function parsePair(pair) {
  const separatorIndex = pair.indexOf("=");

  if (separatorIndex < 1 || separatorIndex === pair.length - 1) {
    throw new Error(`Invalid --pair value: ${pair}`);
  }

  return {
    id: pair.slice(0, separatorIndex),
    agentId: pair.slice(separatorIndex + 1),
  };
}

const pairs = getAllArgs("--pair").map(parsePair);

if (!pairs.length) {
  printUsage();
  process.exit(1);
}

fs.mkdirSync(CANDIDATES_DIR, { recursive: true });
fs.mkdirSync(REVIEW_EDITED_DIR, { recursive: true });

const results = [];

for (const { id, agentId } of pairs) {
  const found = findNewestPng(agentId);

  if (found.error) {
    results.push({ id, agentId, status: "missing", message: found.error });
    continue;
  }

  const currentRow = readRow(id);

  if (!currentRow) {
    results.push({
      id,
      agentId,
      status: "missing-row",
      message: "Queue row does not exist",
    });
    continue;
  }

  const candidatePath = path.join(CANDIDATES_DIR, `${id}-codex-native.png`);
  const editedPath = path.join(REVIEW_EDITED_DIR, `${id}.png`);

  fs.copyFileSync(found.path, candidatePath);
  fs.copyFileSync(candidatePath, editedPath);

  if (!fs.existsSync(candidatePath) || !fs.existsSync(editedPath)) {
    results.push({ id, agentId, status: "copy-failed", source: found.path });
    continue;
  }

  updateStatus(id, "review", {
    editedPath,
    lastError: null,
    promptVersion: PROMPT_VERSION,
  });

  results.push({
    id,
    agentId,
    status: "promoted",
    source: found.path,
    candidate: candidatePath,
    edited: editedPath,
  });
}

console.log(`[v2-image-review] db=${REVIEW_DB_PATH}`);
console.table(results);
console.table(getCounts());

if (results.some((result) => result.status !== "promoted")) {
  process.exitCode = 1;
}
