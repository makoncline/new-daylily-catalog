#!/usr/bin/env node

import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function readArguments(argv) {
  const result = { head: undefined, ref: undefined };

  for (let index = 0; index < argv.length; index += 2) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (!value) throw new Error(`${argument} needs a value.`);
    if (argument === "--head") result.head = value;
    else if (argument === "--ref") result.ref = value;
    else throw new Error(`Unknown argument: ${argument}`);
  }

  if (!result.head || !result.ref) {
    throw new Error("--head and --ref are required.");
  }
  return result;
}

function runGit(arguments_) {
  return spawnSync("git", arguments_, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function writeResult(trusted, reason) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `trusted=${String(trusted)}\nreason=${reason}\n`,
    );
  }
  process.stdout.write(`${JSON.stringify({ reason, trusted })}\n`);
}

function main() {
  const options = readArguments(process.argv.slice(2));
  if (!/^[0-9a-f]{40}$/iu.test(options.head)) {
    writeResult(false, "invalid-head");
    return;
  }

  const validRef = runGit(["check-ref-format", `refs/heads/${options.ref}`]);
  if (validRef.status !== 0) {
    writeResult(false, "invalid-ref");
    return;
  }

  const candidateCommit = runGit([
    "rev-parse",
    "--verify",
    `${options.head}^{commit}`,
  ]);
  if (candidateCommit.status !== 0) {
    writeResult(false, "unknown-head");
    return;
  }

  const originHead = runGit([
    "show-ref",
    "--verify",
    "--hash",
    `refs/remotes/origin/${options.ref}`,
  ]);
  if (originHead.status !== 0) {
    writeResult(false, "missing-origin-ref");
    return;
  }

  const trusted = originHead.stdout.trim() === candidateCommit.stdout.trim();
  writeResult(trusted, trusted ? "same-repository-ref" : "not-origin-head");
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
}
