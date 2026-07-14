import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("local app launcher ownership", () => {
  it("spawns Next directly so shutdown targets the actual server", () => {
    for (const file of [
      "run-hermetic-local.ts",
      "run-realistic-data-local.mjs",
    ]) {
      const source = fs.readFileSync(
        path.join(process.cwd(), "scripts", file),
        "utf8",
      );
      expect(source).toContain('resolve("next/dist/bin/next")');
      expect(source).toContain("spawn(\n  process.execPath");
      expect(source).not.toContain('spawn(\n  "pnpm"');
      expect(source).toContain("process.kill(process.pid, signal)");
    }
  });

  it("managed workflows do not add a pnpm or tsx wrapper around launchers", () => {
    const integrationConfig = fs.readFileSync(
      path.join(process.cwd(), "playwright.integration.config.ts"),
      "utf8",
    );
    const agentLoop = fs.readFileSync(
      path.join(process.cwd(), "scripts", "agent-loop.mjs"),
      "utf8",
    );
    const atlasLauncher = fs.readFileSync(
      path.join(process.cwd(), "scripts", "run-hermetic-atlas.mjs"),
      "utf8",
    );

    expect(integrationConfig).toContain(
      'command: "node scripts/run-integration-local.ts"',
    );
    expect(agentLoop).toContain("spawn(process.execPath, [serverScript]");
    expect(atlasLauncher).toContain(
      'spawn(process.execPath, ["scripts/run-hermetic-local.ts"]',
    );
  });
});
