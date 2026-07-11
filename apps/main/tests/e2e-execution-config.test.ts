import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { e2eCiGroups, validateE2eCiGroups } from "../scripts/e2e-ci-groups.mjs";

const repoRoot = path.resolve(process.cwd(), "../..");

describe("E2E execution infrastructure", () => {
  it("runs every Playwright test across isolated CI shards", () => {
    const workflow = fs.readFileSync(
      path.join(repoRoot, ".github/workflows/pr-tests.yml"),
      "utf8",
    );
    const globalSetup = fs.readFileSync(
      path.join(process.cwd(), "e2e/global-setup.ts"),
      "utf8",
    );
    const previewWorkflow = fs.readFileSync(
      path.join(repoRoot, ".github/workflows/e2e-on-preview.yml"),
      "utf8",
    );

    expect(workflow).toContain("matrix:\n        group: [1, 2, 3]");
    expect(workflow.match(/node-version: 24/g)).toHaveLength(2);
    expect(workflow).toContain(
      "run-e2e-ci-group.mjs --group=${{ matrix.group }}",
    );
    expect(workflow).toContain("path: ~/.cache/ms-playwright");
    expect(workflow).toContain("path: apps/main/local/eslint/.eslintcache");
    expect(previewWorkflow).toContain("node-version: 24");
    expect(previewWorkflow).toContain("path: ~/.cache/ms-playwright");
    expect(previewWorkflow).toContain("playwright install-deps chromium");
    expect(previewWorkflow).not.toContain("playwright install --with-deps");
    expect(previewWorkflow).toContain(
      "github.event.deployment_status.creator.login == 'vercel[bot]'",
    );
    expect(previewWorkflow).toContain(
      "github.event.deployment_status.environment_url != ''",
    );
    expect(previewWorkflow).toContain("&& 'eligible' || github.run_id");
    expect(globalSetup).toContain('rmSync(path.join(process.cwd(), ".next"');
  });

  it("assigns every local E2E file to exactly one weighted group", () => {
    const { assigned, discovered } = validateE2eCiGroups();

    expect(assigned.sort()).toEqual(discovered);
    expect(Object.values(e2eCiGroups).map((group) => group.length)).toEqual([
      4, 5, 5,
    ]);
  });
});
