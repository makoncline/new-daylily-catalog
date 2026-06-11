#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const sourceRoot = "apps/main/src";
const testRoot = "apps/main/tests";
const roots = [
  { label: "Source", path: sourceRoot, maxLinesOption: "maxLines" },
  { label: "Test", path: testRoot, maxLinesOption: "maxTestLines" },
];

const includedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const ignoredSegments = new Set([
  "node_modules",
  ".next",
  "coverage",
  "playwright-report",
  "test-results",
]);
const ignoredPaths = new Set(["apps/main/src/components/ui"]);

const defaultOptions = {
  limit: 20,
  maxLines: 1200,
  maxTestLines: 1200,
  failOnThreshold: false,
};

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function relativePath(absolutePath) {
  return toPosixPath(path.relative(repoRoot, absolutePath));
}

function isIgnored(absolutePath) {
  const relative = relativePath(absolutePath);

  if (
    ignoredPaths.has(relative) ||
    [...ignoredPaths].some((ignoredPath) => relative.startsWith(`${ignoredPath}/`))
  ) {
    return true;
  }

  return relative.split("/").some((segment) => ignoredSegments.has(segment));
}

function parsePositiveInteger(optionName, rawValue) {
  const value = Number.parseInt(rawValue, 10);

  if (!Number.isSafeInteger(value) || value <= 0 || String(value) !== rawValue) {
    throw new Error(`${optionName} must be a positive integer.`);
  }

  return value;
}

function readOptionValue(args, index, optionName) {
  const value = args[index + 1];

  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${optionName} requires a value.`);
  }

  return value;
}

function parseArgs(args) {
  const options = { ...defaultOptions };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--fail-on-threshold") {
      options.failOnThreshold = true;
      continue;
    }

    if (arg === "--limit") {
      const value = readOptionValue(args, index, arg);
      options.limit = parsePositiveInteger(arg, value);
      index += 1;
      continue;
    }

    if (arg === "--max-lines") {
      const value = readOptionValue(args, index, arg);
      options.maxLines = parsePositiveInteger(arg, value);
      index += 1;
      continue;
    }

    if (arg === "--max-test-lines") {
      const value = readOptionValue(args, index, arg);
      options.maxTestLines = parsePositiveInteger(arg, value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function countLines(contents) {
  if (contents.length === 0) {
    return 0;
  }

  const lines = contents.split("\n");
  return lines.at(-1) === "" ? lines.length - 1 : lines.length;
}

async function collectFiles(directory) {
  if (isIgnored(directory)) {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (isIgnored(absolutePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && includedExtensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function collectHotspots(rootPath) {
  const absoluteRoot = path.resolve(repoRoot, rootPath);
  const files = await collectFiles(absoluteRoot);
  const rows = [];

  for (const file of files) {
    const contents = await readFile(file, "utf8");
    rows.push({
      lines: countLines(contents),
      path: relativePath(file),
    });
  }

  return rows.sort((left, right) => {
    if (right.lines !== left.lines) {
      return right.lines - left.lines;
    }

    return left.path.localeCompare(right.path);
  });
}

function printTable(title, rows, limit) {
  console.log(`${title} (top ${limit})`);
  console.log("lines  path");
  console.log("-----  ----");

  for (const row of rows.slice(0, limit)) {
    console.log(`${String(row.lines).padEnd(5)}  ${row.path}`);
  }

  console.log("");
}

function printThresholdGroup(label, threshold, failures, limit) {
  if (failures.length === 0) {
    return;
  }

  console.error(`${label} files over ${threshold} lines:`);

  for (const row of failures.slice(0, limit)) {
    console.error(`  ${row.lines}  ${row.path}`);
  }

  if (failures.length > limit) {
    console.error(`  ... and ${failures.length - limit} more`);
  }
}

function printThresholdFailures(groupedFailures, options) {
  console.error("Maintainability hotspot thresholds exceeded.");

  for (const group of groupedFailures) {
    printThresholdGroup(group.label, group.threshold, group.failures, options.limit);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const results = [];

  for (const root of roots) {
    results.push({
      ...root,
      rows: await collectHotspots(root.path),
    });
  }

  for (const result of results) {
    printTable(`${result.label} hotspots`, result.rows, options.limit);
  }

  if (!options.failOnThreshold) {
    return;
  }

  const groupedFailures = results
    .map((result) => {
      const threshold = options[result.maxLinesOption];

      return {
        label: result.label,
        threshold,
        failures: result.rows.filter((row) => row.lines > threshold),
      };
    })
    .filter((group) => group.failures.length > 0);

  if (groupedFailures.length > 0) {
    printThresholdFailures(groupedFailures, options);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
