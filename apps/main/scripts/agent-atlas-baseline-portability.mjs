#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { getAtlasRoot } from "./agent-atlas-paths.mjs";

export const baselineArchiveName = "daylily-agent-atlas-baseline.tar.gz";

/** @param {string[]} argv */
export function parseBaselineArgs(argv) {
  const values = argv.filter((value) => value !== "--");
  return { action: values[0], archivePath: values[1] };
}

/** @param {{ version?: number; count?: number; approvedAt?: string } | null | undefined} value */
export function validateBaselineManifest(value) {
  if (!value || value.version !== 1)
    throw new Error("Unsupported baseline manifest.");
  const count = value.count;
  if (!Number.isInteger(count) || !count || count < 1)
    throw new Error("Baseline manifest has no screenshots.");
  return { ...value, count };
}

/** @param {string} baselineRoot */
function validateBaselineDirectory(baselineRoot) {
  const manifest = validateBaselineManifest(
    JSON.parse(readFileSync(path.join(baselineRoot, "baseline.json"), "utf8")),
  );
  const count = readdirSync(baselineRoot).filter((file) =>
    file.endsWith(".png"),
  ).length;
  if (count !== manifest.count) {
    throw new Error(
      `Baseline archive contains ${count} screenshots; expected ${manifest.count}.`,
    );
  }
  return count;
}

/** @param {string} stagedBaselineRoot @param {string} baselineRoot */
export function replaceImportedAtlasBaseline(stagedBaselineRoot, baselineRoot) {
  const count = validateBaselineDirectory(stagedBaselineRoot);
  const backupRoot = `${baselineRoot}.import-backup-${process.pid}-${Date.now()}`;
  const hadBaseline = existsSync(baselineRoot);
  if (hadBaseline) renameSync(baselineRoot, backupRoot);
  try {
    renameSync(stagedBaselineRoot, baselineRoot);
  } catch (error) {
    if (hadBaseline && !existsSync(baselineRoot)) {
      renameSync(backupRoot, baselineRoot);
    }
    throw error;
  }
  rmSync(backupRoot, { recursive: true, force: true });
  return count;
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename);
if (isCli) {
  const appRoot = path.resolve(import.meta.dirname, "..");
  const atlasRoot = getAtlasRoot(appRoot);
  const baselineRoot = path.join(atlasRoot, "baseline");
  const parsed = parseBaselineArgs(process.argv.slice(2));
  const archivePath = path.resolve(
    parsed.archivePath ?? path.join(atlasRoot, baselineArchiveName),
  );
  const action = parsed.action;
  if (action === "export") {
    const manifestPath = path.join(baselineRoot, "baseline.json");
    if (!existsSync(manifestPath))
      throw new Error(
        "No baseline manifest. Run node scripts/agent-atlas-baseline.mjs first.",
      );
    validateBaselineManifest(JSON.parse(readFileSync(manifestPath, "utf8")));
    const result = spawnSync(
      "tar",
      ["-czf", archivePath, "-C", atlasRoot, "baseline"],
      { stdio: "inherit" },
    );
    if (result.status !== 0) process.exit(result.status ?? 1);
    console.log(`Exported portable baseline to ${archivePath}`);
  } else if (action === "import") {
    if (!existsSync(archivePath))
      throw new Error(`Baseline archive not found: ${archivePath}`);
    mkdirSync(atlasRoot, { recursive: true });
    const importRoot = mkdtempSync(path.join(atlasRoot, ".baseline-import-"));
    try {
      const result = spawnSync(
        "tar",
        ["-xzf", archivePath, "-C", importRoot, "baseline"],
        { stdio: "inherit" },
      );
      if (result.error) throw result.error;
      if (result.status !== 0) {
        throw new Error(`Baseline archive extraction exited ${result.status}.`);
      }
      const count = replaceImportedAtlasBaseline(
        path.join(importRoot, "baseline"),
        baselineRoot,
      );
      console.log(`Imported ${count}-screenshot baseline from ${archivePath}`);
    } finally {
      rmSync(importRoot, { recursive: true, force: true });
    }
  } else {
    throw new Error(
      "Usage: agent-atlas-baseline-portability.mjs <export|import> [archive-path]",
    );
  }
}
