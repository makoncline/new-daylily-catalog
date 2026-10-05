// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { expect, it } from "vitest";
import { buildReadOnlyMcpTools } from "@/server/mcp/read-only-mcp-tools";
import { memberWriteMcpTools } from "@/server/mcp/member-write-mcp-tools";

it("builds a public upload ZIP whose review cases match the current MCP", async () => {
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
    ).toEqual(["assets/icon.svg", "mcp.json", "plugin.json"]);
    const manifest = JSON.parse(await zip.file("plugin.json")!.async("string"));
    const mcp = JSON.parse(await zip.file("mcp.json")!.async("string"));
    expect(manifest.name).toBe("daylily-catalog");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    const metadata = manifest.extensions["com.openai"];
    expect(metadata.interface.displayName.length).toBeLessThanOrEqual(30);
    expect(metadata.interface.shortDescription.length).toBeLessThanOrEqual(30);
    for (const name of [
      "websiteURL",
      "supportURL",
      "privacyPolicyURL",
      "termsOfServiceURL",
    ]) {
      expect(new URL(metadata.interface[name]).origin).toBe(
        "https://daylilycatalog.com",
      );
    }
    for (const field of ["logo", "composerIcon"]) {
      expect(
        zip.file(metadata.interface[field].replace(/^\.\//, "")),
      ).not.toBeNull();
    }
    expect(mcp.mcpServers).toEqual({
      "daylily-catalog": {
        type: "streamable-http",
        url: "https://daylilycatalog.com/api/mcp/server",
      },
    });
    expect(metadata.review.test_cases.positive).toHaveLength(5);
    expect(metadata.review.test_cases.negative).toHaveLength(3);
    const tools = new Set(
      [...buildReadOnlyMcpTools(["catalog:read"]), ...memberWriteMcpTools].map(
        (tool) => tool.name,
      ),
    );
    for (const testCase of [
      ...metadata.review.test_cases.positive,
      ...metadata.review.test_cases.negative,
    ]) {
      for (const tool of testCase.tools_triggered?.split(", ") ?? []) {
        expect(tools.has(tool), tool).toBe(true);
      }
    }
    expect(metadata.interface).not.toHaveProperty("screenshots");
    expect(metadata).not.toHaveProperty("apps");
    expect(metadata.review.test_cases.negative[1].expected_behavior).toContain(
      "Do not delete or remove records through MCP",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
