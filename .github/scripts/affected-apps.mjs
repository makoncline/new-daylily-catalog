#!/usr/bin/env node

import { appendFileSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const APP_MAIN = "main";
const APP_STOREFRONT = "storefront";
const APPS = [APP_MAIN, APP_STOREFRONT];
const TURBO_VERSION = "2.9.6";

const sharedRootFiles = new Set([
  ".dockerignore",
  ".npmrc",
  "package.json",
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

export function classifyChangedFiles(filePaths, affectedPackageNames = []) {
  const affected = new Set();

  for (const rawPath of filePaths) {
    const filePath = normalizePath(rawPath.trim());
    if (!filePath) continue;

    if (
      sharedRootFiles.has(filePath) ||
      filePath.startsWith("patches/") ||
      filePath === ".github/workflows/pr-tests.yml" ||
      filePath.startsWith(".github/scripts/affected-apps")
    ) {
      addBoth(affected);
      continue;
    }

    if (
      filePath.startsWith("apps/main/") ||
      filePath.startsWith("packages/standalone-runtime/") ||
      filePath.startsWith(".github/scripts/preview-candidate-provenance") ||
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

  for (const packageName of affectedPackageNames) {
    if (packageName === "@daylily-catalog/main") {
      affected.add(APP_MAIN);
    } else if (packageName === "@daylily-catalog/storefront") {
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
    vercelIgnore: undefined,
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
    else if (argument === "--vercel-ignore") result.vercelIgnore = value;
    else throw new Error(`Unknown argument: ${argument}`);
  }

  return result;
}

function runGit(arguments_, cwd) {
  const command = spawnSync("git", arguments_, { cwd, encoding: "utf8" });
  if (command.status !== 0) {
    throw new Error(
      command.stderr.trim() || `git ${arguments_.join(" ")} failed.`,
    );
  }
  return command.stdout.trim();
}

function repositoryRoot(cwd) {
  return runGit(["rev-parse", "--show-toplevel"], cwd);
}

function changedFilesFromGit({ base, head, mergeBase, repoRoot }) {
  if (!base || !head) {
    throw new Error("--base and --head are required when --path is not used.");
  }

  const range = mergeBase ? `${base}...${head}` : `${base}..${head}`;
  const output = runGit(
    ["diff", "--no-renames", "--name-only", "--diff-filter=ACDMRTUXB", range],
    repoRoot,
  );
  return output.split("\n").filter(Boolean);
}

function needsPackageGraph(filePaths) {
  return filePaths.some((rawPath) => {
    const filePath = normalizePath(rawPath.trim());
    return filePath === "pnpm-lock.yaml" || filePath.startsWith("packages/");
  });
}

function turboInvocation(repoRoot) {
  if (process.env.AFFECTED_APPS_TURBO_BINARY) {
    return { command: process.env.AFFECTED_APPS_TURBO_BINARY, prefix: [] };
  }

  const localTurbo = path.join(repoRoot, "node_modules/.bin/turbo");
  if (existsSync(localTurbo)) {
    return { command: localTurbo, prefix: [] };
  }

  if (process.env.VERCEL === "1") {
    return { command: "turbo", prefix: [] };
  }

  return {
    command: "npx",
    prefix: ["--yes", `turbo@${TURBO_VERSION}`],
  };
}

function affectedPackagesFromTurbo({ base, head, repoRoot }) {
  const currentHead = runGit(["rev-parse", "HEAD"], repoRoot);
  const requestedHead = runGit(["rev-parse", head], repoRoot);
  if (currentHead !== requestedHead) {
    throw new Error(
      "The checked-out commit must match --head for Turbo analysis.",
    );
  }

  const invocation = turboInvocation(repoRoot);
  const command = spawnSync(
    invocation.command,
    [
      ...invocation.prefix,
      "query",
      "affected",
      "--base",
      base,
      "--head",
      head,
      "--packages",
      "@daylily-catalog/main",
      "@daylily-catalog/storefront",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: process.env,
    },
  );
  if (command.status !== 0) {
    throw new Error(
      command.error?.message ||
        command.stderr?.trim() ||
        "Turbo could not calculate affected packages.",
    );
  }

  let output;
  try {
    output = JSON.parse(command.stdout);
  } catch {
    throw new Error("Turbo returned invalid affected-package JSON.");
  }

  const items = output?.data?.affectedPackages?.items;
  if (!Array.isArray(items)) {
    throw new Error("Turbo did not return an affected package list.");
  }
  return items.map((item) => item.name).filter(Boolean);
}

function writeGitHubOutputs(result) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = APPS.map((app) => `${app}=${String(result[app])}`);
  appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
}

function runCli() {
  const options = readArguments(process.argv.slice(2));
  const unknownTargets = [...options.force, options.vercelIgnore].filter(
    (app) => app !== undefined && !APPS.includes(app),
  );
  if (unknownTargets.length > 0) {
    throw new Error(`Unknown app: ${unknownTargets.join(", ")}`);
  }

  if (options.vercelIgnore) {
    options.base = process.env.VERCEL_GIT_PREVIOUS_SHA || "HEAD^";
    options.head = process.env.VERCEL_GIT_COMMIT_SHA || "HEAD";
    options.mergeBase = false;
  }

  const repoRoot = repositoryRoot(process.cwd());
  const files =
    options.paths.length > 0
      ? options.paths
      : changedFilesFromGit({ ...options, repoRoot });

  let affectedPackages = [];
  if (needsPackageGraph(files)) {
    if (!options.base || !options.head) {
      throw new Error(
        "Package or lockfile changes need --base and --head for dependency analysis.",
      );
    }
    affectedPackages = affectedPackagesFromTurbo({
      base: options.base,
      head: options.head,
      repoRoot,
    });
  }

  const result = classifyChangedFiles(files, affectedPackages);
  for (const app of options.force) result[app] = true;

  writeGitHubOutputs(result);
  process.stdout.write(
    `${JSON.stringify({ affected: result, affectedPackages, files })}\n`,
  );

  if (options.vercelIgnore) {
    process.exitCode = result[options.vercelIgnore] ? 1 : 0;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  }
}
