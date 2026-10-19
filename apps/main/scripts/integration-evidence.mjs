import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** @param {string | Buffer} value */
const digest = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
/** @param {string} root @param {string[]} args */
const git = (root, args) => execFileSync("git", args, { cwd: root });

/** @param {string} root */
export function sourceIdentity(root) {
  const files = git(root, [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ])
    .toString()
    .split("\0")
    .filter(Boolean);
  const hash = crypto.createHash("sha256");
  for (const file of [...new Set(files)].sort()) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) {
      hash.update(JSON.stringify([file, "deleted"]));
      continue;
    }
    const stat = fs.lstatSync(absolute);
    const content = stat.isSymbolicLink()
      ? fs.readlinkSync(absolute)
      : fs.readFileSync(absolute);
    hash.update(JSON.stringify([file, stat.mode & 0o777, digest(content)]));
  }
  const fingerprint = hash.digest("hex");
  const dirty =
    git(root, ["status", "--porcelain", "--untracked-files=all"]).length > 0;
  return {
    commit: git(root, ["rev-parse", "HEAD"]).toString().trim(),
    fingerprint,
    dirtyFingerprint: dirty ? fingerprint : null,
  };
}

/** @param {string} appRoot @param {string[]} specs */
export function startEvidence(appRoot, specs) {
  if (
    specs.length !== 1 ||
    specs[0] !== "tests/integration/editor-save.integration.ts"
  )
    throw new Error(
      "Usage: --evidence tests/integration/editor-save.integration.ts. Playwright overrides are not allowed.",
    );
  const root = path.resolve(appRoot, "../..");
  const directory = fs.mkdtempSync(path.join(appRoot, "tests/.tmp/evidence-"));
  fs.mkdirSync(path.join(directory, "private"));
  fs.mkdirSync(path.join(directory, "public"));
  const source = sourceIdentity(root);
  const metadata = {
    source,
    command: [
      "node",
      "apps/main/scripts/run-integration-local.mjs",
      "--evidence",
      ...specs,
    ],
    startedAt: new Date().toISOString(),
    fixture: {
      seed: digest(
        fs.readFileSync(
          path.join(appRoot, "scripts/seed-integration-data.mjs"),
        ),
      ),
      schema: digest(
        fs.readFileSync(path.join(appRoot, "prisma/schema.prisma")),
      ),
    },
    outcome: "running",
  };
  const summaryPath = path.join(directory, "public/summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(metadata, null, 2));
  return {
    directory,
    /** @param {number} exitCode @param {NodeJS.Signals} [signal] */
    finish(exitCode, signal) {
      const finalSource = sourceIdentity(root);
      const sourceChanged =
        source.commit !== finalSource.commit ||
        source.fingerprint !== finalSource.fingerprint;
      const resultsPath = path.join(directory, "private/results.json");
      const results = fs.existsSync(resultsPath)
        ? JSON.parse(fs.readFileSync(resultsPath, "utf8"))
        : null;
      const outcome = signal
        ? "interrupted"
        : exitCode === 0 && results?.status === "passed"
          ? "passed"
          : "failed";
      fs.writeFileSync(
        summaryPath,
        JSON.stringify(
          {
            ...metadata,
            finishedAt: new Date().toISOString(),
            outcome,
            exitCode,
            signal: signal ?? null,
            sourceChanged,
            sourceCheck: "run-boundaries",
            sourceAtEnd: finalSource,
            valid: outcome === "passed" && !sourceChanged,
            tests: results?.tests ?? [],
          },
          null,
          2,
        ),
      );
      return sourceChanged;
    },
  };
}
