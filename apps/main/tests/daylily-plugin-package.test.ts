// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { expect, it } from "vitest";
import { buildReadOnlyMcpTools } from "@/server/mcp/read-only-mcp-tools";
import { memberWriteMcpTools } from "@/server/mcp/member-write-mcp-tools";

it("builds a complete MCP submission with its endpoint, assets, and review cases", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "daylily-plugin-"));
  try {
    const zipPath = path.join(directory, "plugin.zip");
    const reviewVideoUrl = "https://example.com/private-plugin-review.mp4";
    execFileSync(
      process.execPath,
      [
        "scripts/build-plugin.mjs",
        zipPath,
        "--review-video-url",
        reviewVideoUrl,
      ],
      {
        cwd: process.cwd(),
      },
    );
    const zip = await JSZip.loadAsync(readFileSync(zipPath));
    expect(
      Object.keys(zip.files)
        .filter((name) => !zip.files[name]?.dir)
        .sort(),
    ).toEqual(["assets/icon.svg", "mcp.json", "plugin.json"]);
    const manifest = JSON.parse(await zip.file("plugin.json")!.async("string"));
    expect(manifest.name).toBe("daylily-catalog");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    const metadata = manifest.extensions["com.openai"];
    expect(metadata.review.demo_recording_url).toBe(reviewVideoUrl);
    const sourceManifest = JSON.parse(
      readFileSync("../../plugins/daylily-catalog/plugin.json", "utf8"),
    );
    expect(sourceManifest.extensions["com.openai"].review).not.toHaveProperty(
      "demo_recording_url",
    );
    const listing = metadata.interface;
    expect(listing.displayName.length).toBeLessThanOrEqual(30);
    expect(listing.shortDescription.length).toBeLessThanOrEqual(30);
    for (const name of [
      "websiteURL",
      "supportURL",
      "privacyPolicyURL",
      "termsOfServiceURL",
    ]) {
      expect(new URL(listing[name]).origin).toBe("https://daylilycatalog.com");
    }
    for (const field of ["logo", "composerIcon"]) {
      expect(zip.file(listing[field].replace(/^\.\//, ""))).not.toBeNull();
    }
    expect(manifest.$schema).toBe(
      "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    );
    expect(manifest).not.toHaveProperty("mcpServers");
    expect(manifest).not.toHaveProperty("apps");
    const mcp = JSON.parse(await zip.file("mcp.json")!.async("string"));
    expect(mcp).toEqual({
      $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
      mcpServers: {
        "daylily-catalog": {
          type: "streamable-http",
          url: "https://daylilycatalog.com/api/mcp/server",
        },
      },
    });
    const reviewCases = JSON.parse(
      readFileSync(
        path.join(
          process.cwd(),
          "../../plugins/daylily-catalog/review-cases.json",
        ),
        "utf8",
      ),
    );
    expect(metadata.review.test_cases).toEqual(reviewCases);
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
    expect(listing).not.toHaveProperty("screenshots");
    expect(metadata).not.toHaveProperty("apps");
    expect(reviewCases.negative[1].expected_behavior).toContain(
      "Do not delete or remove records through MCP",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
