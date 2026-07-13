import { spawnSync } from "node:child_process";
import { e2eCiGroups, validateE2eCiGroups } from "./e2e-ci-groups.mjs";

function readGroup() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const value = args.find((arg) => arg.startsWith("--group="))?.split("=")[1];
  const group = Number(value);
  if (!Number.isInteger(group) || !(group in e2eCiGroups)) {
    throw new Error(
      `Expected --group=1, --group=2, or --group=3. Got: ${value}`,
    );
  }
  return group;
}

const group = readGroup();
validateE2eCiGroups();
const listOnly = process.argv.includes("--list");

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(
  command,
  [
    "exec",
    "playwright",
    "test",
    ...e2eCiGroups[group],
    ...(listOnly ? ["--list"] : []),
  ],
  { stdio: "inherit", env: process.env },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
