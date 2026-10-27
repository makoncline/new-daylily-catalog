import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const manifest = JSON.parse(
  readFileSync(path.join(repoRoot, "package.json"), "utf8"),
);
const requiredNode = readFileSync(path.join(repoRoot, ".nvmrc"), "utf8").trim();
if (process.versions.node !== requiredNode)
  throw new Error(`Use Node ${requiredNode}.`);
const pnpmVersion = spawnSync("pnpm", ["--version"], { encoding: "utf8" });
if (`pnpm@${pnpmVersion.stdout?.trim()}` !== manifest.packageManager)
  throw new Error(`Use ${manifest.packageManager}.`);
const env = { ...process.env };
delete env.OP_SERVICE_ACCOUNT_TOKEN;
for (const args of [
  ["install", "--frozen-lockfile"],
  ["main", "exec", "playwright", "install", "chromium"],
]) {
  const result = spawnSync("pnpm", args, {
    cwd: repoRoot,
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
