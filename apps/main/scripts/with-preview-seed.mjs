import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const config = JSON.parse(
  readFileSync(
    new URL("./1password-development.json", import.meta.url),
    "utf8",
  ),
);
const injected = process.argv[2] === "--injected";
if (process.argv.length !== (injected ? 3 : 2))
  throw new Error("This command accepts no arguments.");
const cli =
  process.platform === "linux"
    ? path.resolve(import.meta.dirname, "../../../.tmp/tools/op")
    : "op";
const childEnv = Object.fromEntries(
  [
    "PATH",
    "HOME",
    "TMPDIR",
    "TEMP",
    "TMP",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "NO_PROXY",
    "NODE_USE_ENV_PROXY",
    "NODE_EXTRA_CA_CERTS",
    "SSL_CERT_FILE",
  ]
    .filter((key) => process.env[key] !== undefined)
    .map((key) => [key, process.env[key]]),
);
let command, args;
if (injected) {
  if (!process.env.PREVIEW_SEED_TURSO_AUTH_TOKEN)
    throw new Error(
      "Missing PREVIEW_SEED_TURSO_AUTH_TOKEN in the Development environment.",
    );
  childEnv.PREVIEW_SEED_TURSO_AUTH_TOKEN =
    process.env.PREVIEW_SEED_TURSO_AUTH_TOKEN;
  command = process.execPath;
  args = [path.join(import.meta.dirname, "prepare-preview-seed.mjs")];
} else {
  if (process.env.OP_SERVICE_ACCOUNT_TOKEN)
    childEnv.OP_SERVICE_ACCOUNT_TOKEN = process.env.OP_SERVICE_ACCOUNT_TOKEN;
  command = cli;
  args = [
    "run",
    "--environment",
    config.environmentId,
    "--",
    process.execPath,
    import.meta.filename,
    "--injected",
  ];
}
const child = spawn(command, args, { env: childEnv, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
const result = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", (code, signal) => resolve({ code, signal }));
});
if (result.signal) process.kill(process.pid, result.signal);
else process.exitCode = result.code ?? 1;
