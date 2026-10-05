// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { expect, it } from "vitest";
import { buildReadOnlyMcpTools } from "@/server/mcp/read-only-mcp-tools";
import { memberWriteMcpTools } from "@/server/mcp/member-write-mcp-tools";

it("builds the original hosted metadata update and checks its separate review cases", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "daylily-plugin-"));
  try {
    const zipPath = path.join(directory, "plugin.zip");
    execFileSync(process.execPath, ["scripts/build-plugin.mjs", zipPath], {
      cwd: process.cwd(),
    });
    const zip = await JSZip.loadAsync(readFileSync(zipPath));
    expect(
      Object.keys(zip.files)
        .filter((name) => !zip.files[name]?.dir)
        .sort(),
    ).toEqual([".codex-plugin/plugin.json", "assets/icon.svg"]);
    const manifest = JSON.parse(
      await zip.file(".codex-plugin/plugin.json")!.async("string"),
    );
    expect(manifest.name).toBe("app-6a061b5279b88191a07a9e0866721e29");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    const metadata = manifest.extensions["com.openai"];
    expect(manifest.interface.displayName.length).toBeLessThanOrEqual(30);
    expect(manifest.interface.shortDescription.length).toBeLessThanOrEqual(30);
    for (const name of [
      "websiteURL",
      "supportURL",
      "privacyPolicyURL",
      "termsOfServiceURL",
    ]) {
      expect(new URL(manifest.interface[name]).origin).toBe(
        "https://daylilycatalog.com",
      );
    }
    for (const field of ["logo", "composerIcon"]) {
      expect(
        zip.file(manifest.interface[field].replace(/^\.\//, "")),
      ).not.toBeNull();
    }
    expect(manifest).not.toHaveProperty("mcpServers");
    expect(manifest).not.toHaveProperty("apps");
    expect(metadata.review).not.toHaveProperty("test_cases");
    const reviewCases = JSON.parse(
      readFileSync(
        path.join(
          process.cwd(),
          "../../plugins/daylily-catalog/review-cases.json",
        ),
        "utf8",
      ),
    );
    expect(reviewCases.positive).toHaveLength(5);
    expect(reviewCases.negative).toHaveLength(3);
    const tools = new Set(
      [...buildReadOnlyMcpTools(["catalog:read"]), ...memberWriteMcpTools].map(
        (tool) => tool.name,
      ),
    );
    for (const testCase of [...reviewCases.positive, ...reviewCases.negative]) {
      for (const tool of testCase.tools_triggered?.split(", ") ?? []) {
        expect(tools.has(tool), tool).toBe(true);
      }
    }
    expect(manifest.interface).not.toHaveProperty("screenshots");
    expect(metadata).not.toHaveProperty("apps");
    expect(reviewCases.negative[1].expected_behavior).toContain(
      "Do not delete or remove records through MCP",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
