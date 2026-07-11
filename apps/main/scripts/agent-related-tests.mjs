import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");

/** @param {string} command @param {string[]} args @param {string} cwd */
function capture(command, args, cwd = repoRoot) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout.trim();
}

/** @param {string[]} args */
function runVitest(args) {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(command, ["exec", "vitest", ...args], {
    cwd: appRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

/** @param {string[]} files */
export function selectRelatedTestInputs(files) {
  const normalized = [
    ...new Set(files.map((file) => file.replaceAll("\\", "/"))),
  ];
  const fullSuite = normalized.some(
    (file) =>
      file === "pnpm-lock.yaml" ||
      file === "apps/main/package.json" ||
      file === "apps/main/vitest.config.ts" ||
      file === "apps/main/vitest.setup.ts",
  );
  const directTests = normalized
    .filter((file) => /^apps\/main\/tests\/.*\.test\.tsx?$/.test(file))
    .map((file) => file.replace("apps/main/", ""));
  const relatedSources = normalized
    .filter((file) => file.startsWith("apps/main/src/"))
    .map((file) => file.replace("apps/main/", ""));

  return { fullSuite, directTests, relatedSources };
}

function main() {
  const explicitFiles = process.env.AGENT_CHANGED_FILES;
  const files = explicitFiles
    ? explicitFiles
        .split(/[\n,]/)
        .map((file) => file.trim())
        .filter(Boolean)
    : [
        capture("git", ["diff", "--name-only", "HEAD"]),
        capture("git", ["ls-files", "--others", "--exclude-standard"]),
      ]
        .join("\n")
        .split("\n")
        .map((file) => file.trim())
        .filter(Boolean);

  const selection = selectRelatedTestInputs(files);
  if (selection.fullSuite) {
    console.log(
      "Shared test configuration changed; running the full unit suite.",
    );
    runVitest(["run"]);
  } else {
    if (selection.relatedSources.length) {
      runVitest([
        "related",
        ...selection.relatedSources,
        "--run",
        "--passWithNoTests",
      ]);
    }
    if (selection.directTests.length) {
      runVitest(["run", ...selection.directTests]);
    }
    if (!selection.relatedSources.length && !selection.directTests.length) {
      console.log("No changed files require unit tests.");
    }
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
