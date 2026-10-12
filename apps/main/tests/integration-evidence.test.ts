// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  sourceIdentity,
  startEvidence,
} from "../scripts/integration-evidence.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const directories: string[] = [];
const spec = "tests/integration/editor-save.integration.ts";

afterEach(() => {
  for (const directory of directories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

function repository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "integration-evidence-"));
  directories.push(root);
  const app = path.join(root, "apps/main");
  for (const directory of [
    "tests/.tmp",
    "tests/integration",
    "scripts",
    "prisma",
  ])
    fs.mkdirSync(path.join(app, directory), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".gitignore"),
    "apps/main/tests/.tmp/\n.env\n",
  );
  fs.writeFileSync(
    path.join(app, "scripts/seed-integration-data.mjs"),
    "// Synthetic fixture\n",
  );
  fs.writeFileSync(
    path.join(app, "prisma/schema.prisma"),
    "// Synthetic schema\n",
  );
  fs.writeFileSync(path.join(app, spec), "// Source\n");
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  git("init");
  git("add", ".");
  git(
    "-c",
    "user.name=Integration",
    "-c",
    "user.email=integration@example.test",
    "commit",
    "-m",
    "Fixture",
  );
  return { root, app };
}

describe("integration evidence", () => {
  it("keeps the start identity and invalidates proof when source differs at the end", () => {
    const { root, app } = repository();
    const clean = sourceIdentity(root);
    expect(clean.dirtyFingerprint).toBeNull();
    fs.writeFileSync(path.join(root, ".env"), "private-value");
    expect(sourceIdentity(root)).toEqual(clean);
    fs.writeFileSync(path.join(app, spec), "// Changed source\n");
    const dirty = sourceIdentity(root);
    expect(dirty.dirtyFingerprint).toBe(dirty.fingerprint);
    expect(sourceIdentity(root)).toEqual(dirty);
    const run = startEvidence(app, [spec]);
    fs.writeFileSync(
      path.join(run.directory, "private/results.json"),
      JSON.stringify({ status: "passed", tests: [] }),
    );
    fs.writeFileSync(path.join(app, spec), "// Later change\n");
    expect(run.finish(0)).toBe(true);
    const summary = JSON.parse(
      fs.readFileSync(path.join(run.directory, "public/summary.json"), "utf8"),
    );
    expect(summary).toMatchObject({
      source: dirty,
      sourceCheck: "run-boundaries",
      outcome: "passed",
      sourceChanged: true,
      valid: false,
    });
    expect(JSON.stringify(summary)).not.toContain("private-value");
    expect(() => startEvidence(app, ["--output=elsewhere"])).toThrow(
      "overrides are not allowed",
    );
  });

  it("uses the real Playwright reporter to preserve failed proof, isolate reruns, and select public attachments", () => {
    const { app } = repository();
    const playwright = path.join(
      appRoot,
      "node_modules/@playwright/test/index.mjs",
    );
    const reporter = path.join(
      appRoot,
      "scripts/integration-evidence-reporter.ts",
    );
    fs.writeFileSync(
      path.join(app, spec),
      `
      import { test, expect } from ${JSON.stringify(playwright)};
      test('editor saves recover from rejected writes on desktop', async ({}, info) => {
        await info.attach('evidence-context', { body: JSON.stringify({ browser: 'chromium', version: 'fixture', viewport: { width: 1024, height: 768 }, device: 'desktop' }), contentType: 'application/json' });
        await info.attach('evidence-lists-reloaded', { body: Buffer.from('selected image'), contentType: 'image/png' });
        await info.attach('auth-storage', { body: Buffer.from('private-token'), contentType: 'application/json' });
        await info.attach('trace', { body: Buffer.from('private-request-body'), contentType: 'application/zip' });
        info.attachments.push({ name: 'evidence-listings-reloaded', path: ${JSON.stringify(path.join(app, ".env"))}, contentType: 'image/png' });
        expect(process.env.EVIDENCE_FAIL).toBe('0');
      });
    `,
    );
    fs.writeFileSync(path.join(app, ".env"), "outside-output-secret");
    const run = (fail: boolean) => {
      const evidence = startEvidence(app, [spec]);
      const config = path.join(evidence.directory, "private/config.mjs");
      fs.writeFileSync(
        config,
        `export default ${JSON.stringify({
          testDir: path.join(app, "tests/integration"),
          testMatch: "**/*.integration.ts",
          workers: 1,
          retries: 0,
          outputDir: path.join(evidence.directory, "private/results"),
          reporter: [[reporter, { directory: evidence.directory }]],
        })};`,
      );
      const result = spawnSync(
        path.join(appRoot, "node_modules/.bin/playwright"),
        ["test", "--config", config],
        {
          cwd: app,
          encoding: "utf8",
          env: { ...process.env, EVIDENCE_FAIL: fail ? "1" : "0" },
        },
      );
      expect(result.status, result.stdout + result.stderr).toBe(fail ? 1 : 0);
      expect(evidence.finish(result.status ?? 1)).toBe(false);
      return evidence.directory;
    };
    const failed = run(true);
    const failedSummary = fs.readFileSync(
      path.join(failed, "public/summary.json"),
      "utf8",
    );
    const passed = run(false);
    expect(passed).not.toBe(failed);
    expect(
      fs.readFileSync(path.join(failed, "public/summary.json"), "utf8"),
    ).toBe(failedSummary);
    expect(JSON.parse(failedSummary)).toMatchObject({
      outcome: "failed",
      valid: false,
      tests: [
        {
          status: "failed",
          media: [{ file: "1-evidence-lists-reloaded.png" }],
        },
      ],
    });
    const summary = fs.readFileSync(
      path.join(passed, "public/summary.json"),
      "utf8",
    );
    expect(JSON.parse(summary)).toMatchObject({
      outcome: "passed",
      valid: true,
      tests: [
        {
          status: "passed",
          context: {
            browser: "chromium",
            viewport: { width: 1024, height: 768 },
          },
        },
      ],
    });
    expect(fs.readdirSync(path.join(passed, "public")).sort()).toEqual([
      "1-evidence-lists-reloaded.png",
      "summary.json",
    ]);
    expect(summary).not.toMatch(
      /private-token|private-request-body|outside-output-secret/,
    );
    expect(fs.existsSync(path.join(failed, "private/results"))).toBe(true);
  }, 30_000);
});
