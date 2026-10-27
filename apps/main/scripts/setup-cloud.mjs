import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  accessSync,
  constants,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const config = JSON.parse(
  readFileSync(
    new URL("./1password-development.json", import.meta.url),
    "utf8",
  ),
);
const checksums = {
  x64: "e52476700cba9202ac7469bdfb2648ecdbf3438ac85822010f77230139e74966",
  arm64: "89abd60c17d5c614066c20e6abed816449eb018c5e0679ed63d57071c7bee85e",
};
if (process.platform !== "linux" || !checksums[process.arch])
  throw new Error("Cloud setup requires Linux x64 or ARM64.");
const env = { ...process.env };
delete env.OP_SERVICE_ACCOUNT_TOKEN;
function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} failed (${result.status}).`);
}
run(process.execPath, [path.join(import.meta.dirname, "setup-local.mjs")]);
const directory = mkdtempSync(path.join(tmpdir(), "daylily-op-"));
try {
  const arch = process.arch === "x64" ? "amd64" : "arm64";
  const response = await fetch(
    `https://cache.agilebits.com/dist/1P/op2/pkg/v${config.cliVersion}/op_linux_${arch}_v${config.cliVersion}.zip`,
  );
  if (!response.ok)
    throw new Error(`1Password CLI download failed (${response.status}).`);
  const archive = Buffer.from(await response.arrayBuffer());
  if (
    createHash("sha256").update(archive).digest("hex") !==
    checksums[process.arch]
  )
    throw new Error("1Password CLI archive checksum mismatch.");
  const archivePath = path.join(directory, "op.zip");
  writeFileSync(archivePath, archive);
  run("unzip", ["-q", archivePath, "-d", directory]);
  let writable = true;
  try {
    accessSync("/usr/local/bin", constants.W_OK);
  } catch {
    writable = false;
  }
  const installArgs = [
    "-m",
    "0755",
    path.join(directory, "op"),
    "/usr/local/bin/op",
  ];
  if (writable) run("install", installArgs);
  else run("sudo", ["-n", "install", ...installArgs]);
  run("/usr/local/bin/op", ["--version"]);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
