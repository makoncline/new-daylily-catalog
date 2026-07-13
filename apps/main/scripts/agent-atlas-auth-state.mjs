import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { getAtlasRoot } from "./agent-atlas-paths.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const authRoot = path.join(getAtlasRoot(appRoot), ".auth");
const authFiles = [
  path.join(authRoot, "rolling-oaks.json"),
  path.join(authRoot, "plant-fancy-gardens.json"),
];

/**
 * @param {Array<{ exists: boolean; mtimeMs: number }>} states
 * @param {number} nowMs
 * @param {number} freshnessMs
 */
export function authStateIsFresh(states, nowMs, freshnessMs) {
  return states.every(
    (state) => state.exists && nowMs - state.mtimeMs < freshnessMs,
  );
}

export function ensureAtlasAuth() {
  const freshnessHours = Number(process.env.AGENT_ATLAS_AUTH_HOURS ?? "8");
  const states = authFiles.map((file) => ({
    exists: existsSync(file),
    mtimeMs: existsSync(file) ? statSync(file).mtimeMs : 0,
    runtimeMatches:
      existsSync(`${file}.runtime`) &&
      readFileSync(`${file}.runtime`, "utf8").trim() ===
        (process.env.AGENT_ATLAS_AUTH_RUNTIME ?? "connected"),
  }));
  const reusable =
    process.env.HERMETIC_MODE !== "1" &&
    process.env.AGENT_ATLAS_FORCE_AUTH !== "1" &&
    authStateIsFresh(states, Date.now(), freshnessHours * 60 * 60 * 1_000) &&
    states.every((state) => state.runtimeMatches);
  if (reusable) {
    console.log(
      `Reusing atlas authentication state (younger than ${freshnessHours}h).`,
    );
    return;
  }

  console.log("Refreshing atlas authentication state for both personas.");
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "playwright",
      "test",
      "-c",
      "playwright.agent-atlas.config.ts",
      "--project=auth-setup",
    ],
    { cwd: appRoot, stdio: "inherit", env: process.env },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
