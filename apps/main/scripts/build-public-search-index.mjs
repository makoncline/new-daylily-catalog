import { existsSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { buildPublicSearchIndex } from "../src/server/search/build-public-search-index.js";

const appRoot = path.resolve(import.meta.dirname, "..");

// Local seed tool only. The VPS endpoint uses the app-owned replica singleton.
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "Use the running app's search-candidate endpoint for production builds.",
  );
}
const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== "--"),
  options: { source: { type: "string" }, target: { type: "string" } },
});
function localPath(value) {
  if (value.includes("://") || value.startsWith("libsql:")) {
    throw new Error("Search seed builds require local file paths.");
  }
  return path.resolve(appRoot, value.replace(/^file:/, ""));
}
const sourcePath = localPath(
  values.source ?? "local/realistic-data/realistic-data.sqlite",
);
const targetPath = localPath(
  values.target ?? ".tmp/search/public-search-candidate.sqlite",
);
const replicaUrl = process.env.TURSO_EMBEDDED_REPLICA_URL;
function sameFile(left, right) {
  if (left === right) return true;
  if (!existsSync(left) || !existsSync(right)) return false;
  const a = statSync(left);
  const b = statSync(right);
  return a.dev === b.dev && a.ino === b.ino;
}
if (replicaUrl && sameFile(sourcePath, localPath(replicaUrl))) {
  throw new Error(
    "Refusing to build search index from live Turso embedded replica.",
  );
}
if (!existsSync(sourcePath)) throw new Error("Source database does not exist.");
for (const artifact of [
  targetPath,
  targetPath + ".next",
  targetPath + ".previous",
]) {
  if (sameFile(sourcePath, artifact)) {
    throw new Error("Source and target artifacts must be different files.");
  }
}
const sourceDb = new PrismaClient({
  adapter: new PrismaLibSql({ url: `file:${realpathSync(sourcePath)}` }),
});
try {
  const result = await buildPublicSearchIndex({
    sourceDb,
    sourceLabel: "local-seed",
    targetPath,
    targetWorkerPath: path.join(
      appRoot,
      "scripts/build-public-search-index-target.mjs",
    ),
  });
  console.log(JSON.stringify(result));
} finally {
  await sourceDb.$disconnect();
}
