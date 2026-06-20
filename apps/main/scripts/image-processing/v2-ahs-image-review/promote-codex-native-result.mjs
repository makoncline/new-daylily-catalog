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

function getArg(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));

  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function printUsage() {
  console.error(
    [
      "Usage:",
      "  pnpm main exec node scripts/image-processing/v2-ahs-image-review/promote-codex-native-result.mjs --id <queue-id> --agent <subagent-id>",
      "  pnpm main exec node scripts/image-processing/v2-ahs-image-review/promote-codex-native-result.mjs --id <queue-id> --src <generated-png>",
    ].join("\n"),
  );
}

function findNewestPng(agentId) {
  const agentDir = path.join(GENERATED_IMAGES_ROOT, agentId);

  if (!fs.existsSync(agentDir)) {
    throw new Error(`Generated image directory does not exist: ${agentDir}`);
  }

  const pngPaths = fs
    .readdirSync(agentDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
    .map((entry) => path.join(agentDir, entry.name))
    .sort((left, right) => {
      const leftStat = fs.statSync(left);
      const rightStat = fs.statSync(right);
      return rightStat.mtimeMs - leftStat.mtimeMs;
    });

  if (!pngPaths[0]) {
    throw new Error(`No generated PNG found in: ${agentDir}`);
  }

  return pngPaths[0];
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

const id = getArg("--id");
const agentId = getArg("--agent");
const explicitSource = getArg("--src");

if (!id || (!agentId && !explicitSource)) {
  printUsage();
  process.exit(1);
}

const sourcePath = explicitSource ?? findNewestPng(agentId);

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Generated PNG does not exist: ${sourcePath}`);
}

const currentRow = readRow(id);

if (!currentRow) {
  throw new Error(`Queue row does not exist: ${id}`);
}

fs.mkdirSync(CANDIDATES_DIR, { recursive: true });
fs.mkdirSync(REVIEW_EDITED_DIR, { recursive: true });

const candidatePath = path.join(CANDIDATES_DIR, `${id}-codex-native.png`);
const editedPath = path.join(REVIEW_EDITED_DIR, `${id}.png`);

fs.copyFileSync(sourcePath, candidatePath);
fs.copyFileSync(candidatePath, editedPath);

if (!fs.existsSync(candidatePath) || !fs.existsSync(editedPath)) {
  throw new Error(`Promotion copy failed for ${id}`);
}

const updated = updateStatus(id, "review", {
  editedPath,
  lastError: null,
  promptVersion: PROMPT_VERSION,
});

if (!updated) {
  throw new Error(`Failed to update queue row: ${id}`);
}

console.log(`[v2-image-review] promoted ${id}`);
console.log(`[v2-image-review] source=${sourcePath}`);
console.log(`[v2-image-review] candidate=${candidatePath}`);
console.log(`[v2-image-review] edited=${editedPath}`);
console.log(`[v2-image-review] db=${REVIEW_DB_PATH}`);
console.table([readRow(id)]);
console.table(getCounts());
