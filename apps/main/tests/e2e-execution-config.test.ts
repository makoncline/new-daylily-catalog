import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

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

    expect(workflow).toContain("matrix:\n        shard: [1, 2, 3]");
    expect(workflow).toContain("playwright test --shard=${{ matrix.shard }}/3");
    expect(workflow).toContain("path: ~/.cache/ms-playwright");
    expect(globalSetup).toContain('rmSync(path.join(process.cwd(), ".next"');
  });
});
