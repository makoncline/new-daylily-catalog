import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { requireTestKey } from "./development-keys.mjs";

const config = JSON.parse(
  readFileSync(
    new URL("./1password-development.json", import.meta.url),
    "utf8",
  ),
);
const args = process.argv.slice(2);
const injected = args[0] === "--injected";
if (injected) args.shift();
const seeded = args[0] === "--seeded-database-default";
if (seeded) args.shift();
if (args[0] === "--") args.shift();
if (!args.length)
  throw new Error("Usage: pnpm secrets:dev -- <command> [args...]");

let command;
let commandArgs;
if (injected) {
  delete process.env.OP_SERVICE_ACCOUNT_TOKEN;
  // Check secret keys before any application command or service request.
  requireTestKey("CLERK_SECRET_KEY", "sk_test_");
  requireTestKey("STRIPE_SECRET_KEY", "sk_test_");
  process.env.DAYLILY_SECRET_STAGE = "development";
  command = process.execPath;
  commandArgs = [
    path.join(import.meta.dirname, "with-env.mjs"),
    "--env",
    "development",
    ...(seeded ? ["--seeded-database-default"] : []),
    "--",
    ...args,
  ];
} else {
  if (!config.environmentId)
    throw new Error(
      "Set the Daylily — Development Environment ID in scripts/1password-development.json. See docs/development.md.",
    );
  const version = spawnSync("op", ["--version"], { encoding: "utf8" });
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.stdout?.trim() ?? "");
  if (
    version.status !== 0 ||
    !match ||
    Number(match[1]) < 2 ||
    (Number(match[1]) === 2 && Number(match[2]) < 41)
  ) {
    throw new Error(
      `Install stable 1Password CLI ${config.cliVersion} or newer.`,
    );
  }
  command = "op";
  commandArgs = [
    "run",
    "--environment",
    config.environmentId,
    "--",
    process.execPath,
    path.resolve(import.meta.filename),
    "--injected",
    ...(seeded ? ["--seeded-database-default"] : []),
    "--",
    ...args,
  ];
}
const childEnv = { ...process.env };
if (!injected) {
  delete childEnv.CLERK_SECRET_KEY;
  delete childEnv.STRIPE_SECRET_KEY;
}
const ownsGroup = !injected && process.platform !== "win32";
const child = spawn(command, commandArgs, {
  detached: ownsGroup,
  env: childEnv,
  stdio: "inherit",
});
const handlers = new Map();
for (const signal of ["SIGINT", "SIGTERM"]) {
  const handler = () => {
    try {
      if (ownsGroup) process.kill(-child.pid, signal);
      else child.kill(signal);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  };
  handlers.set(signal, handler);
  process.on(signal, handler);
}
const result = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", (code, signal) => resolve({ code, signal }));
});
for (const [signal, handler] of handlers) process.off(signal, handler);
if (result.signal) process.kill(process.pid, result.signal);
else process.exitCode = result.code ?? 1;
