#!/usr/bin/env node

import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const APP_MAIN = "main";
const APP_STOREFRONT = "storefront";
const APPS = [APP_MAIN, APP_STOREFRONT];

const sharedRootFiles = new Set([
  ".dockerignore",
  ".npmrc",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
]);

const mainWorkflowFiles = new Set([
  ".github/workflows/db-backup.yml",
  ".github/workflows/e2e-on-preview.yml",
  ".github/workflows/pr-docker-image.yml",
  ".github/workflows/preview-alias.yml",
]);

const storefrontWorkflowFiles = new Set([
  ".github/workflows/storefront-docker-image.yml",
]);

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

function addBoth(affected) {
  affected.add(APP_MAIN);
  affected.add(APP_STOREFRONT);
}

export function classifyChangedFiles(filePaths) {
  const affected = new Set();

  for (const rawPath of filePaths) {
    const filePath = normalizePath(rawPath.trim());
    if (!filePath) continue;

    if (
      sharedRootFiles.has(filePath) ||
      filePath.startsWith("patches/") ||
      filePath.startsWith("packages/config/") ||
      (filePath.startsWith("packages/") &&
        !filePath.startsWith("packages/standalone-runtime/")) ||
      filePath === ".github/workflows/pr-tests.yml" ||
      filePath.startsWith(".github/scripts/affected-apps")
    ) {
      addBoth(affected);
      continue;
    }

    if (
      filePath.startsWith("apps/main/") ||
      filePath.startsWith("packages/standalone-runtime/") ||
      mainWorkflowFiles.has(filePath)
    ) {
      affected.add(APP_MAIN);
      continue;
    }

    if (
      filePath.startsWith("apps/storefront/") ||
      storefrontWorkflowFiles.has(filePath)
    ) {
      affected.add(APP_STOREFRONT);
    }
  }

  return Object.fromEntries(APPS.map((app) => [app, affected.has(app)]));
}

function readArguments(argv) {
  const result = {
    base: undefined,
    force: [],
    head: undefined,
    mergeBase: false,
    paths: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--merge-base") {
      result.mergeBase = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} needs a value.`);
    }
    index += 1;

    if (argument === "--base") result.base = value;
    else if (argument === "--head") result.head = value;
    else if (argument === "--force") result.force.push(value);
    else if (argument === "--path") result.paths.push(value);
    else throw new Error(`Unknown argument: ${argument}`);
  }

  return result;
}

function changedFilesFromGit({ base, head, mergeBase }) {
  if (!base || !head) {
    throw new Error("--base and --head are required when --path is not used.");
  }

  const range = mergeBase ? `${base}...${head}` : `${base}..${head}`;
  const command = spawnSync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACDMRTUXB", range],
    { encoding: "utf8" },
  );

  if (command.status !== 0) {
    throw new Error(command.stderr.trim() || `git diff failed for ${range}.`);
  }

  return command.stdout.split("\n").filter(Boolean);
}

function writeGitHubOutputs(result) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = APPS.map((app) => `${app}=${String(result[app])}`);
  appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
}

function runCli() {
  const options = readArguments(process.argv.slice(2));
  const unknownTargets = options.force.filter((app) => !APPS.includes(app));
  if (unknownTargets.length > 0) {
    throw new Error(`Unknown app: ${unknownTargets.join(", ")}`);
  }

  const files =
    options.paths.length > 0 ? options.paths : changedFilesFromGit(options);
  const result = classifyChangedFiles(files);
  for (const app of options.force) result[app] = true;

  writeGitHubOutputs(result);
  process.stdout.write(`${JSON.stringify({ affected: result, files })}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  }
}
