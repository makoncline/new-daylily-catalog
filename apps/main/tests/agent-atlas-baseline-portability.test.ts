import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  baselineArchiveName,
  parseBaselineArgs,
  replaceImportedAtlasBaseline,
  validateBaselineManifest,
} from "../scripts/agent-atlas-baseline-portability.mjs";

describe("atlas baseline portability", () => {
  it("uses a stable archive name and validates provenance", () => {
    expect(baselineArchiveName).toBe("daylily-agent-atlas-baseline.tar.gz");
    expect(
      validateBaselineManifest({
        version: 1,
        count: 40,
        approvedAt: "2026-07-10T00:00:00.000Z",
      }),
    ).toEqual({
      version: 1,
      count: 40,
      approvedAt: "2026-07-10T00:00:00.000Z",
    });
  });

  it("rejects an unsupported or empty baseline", () => {
    expect(() => validateBaselineManifest({ version: 2, count: 40 })).toThrow(
      "Unsupported baseline manifest",
    );
    expect(() => validateBaselineManifest({ version: 1, count: 0 })).toThrow(
      "Baseline manifest has no screenshots",
    );
  });

  it("ignores pnpm's argument separator", () => {
    expect(parseBaselineArgs(["export", "--", "/tmp/baseline.tar.gz"])).toEqual(
      {
        action: "export",
        archivePath: "/tmp/baseline.tar.gz",
      },
    );
  });

  it("replaces an existing baseline without retaining stale captures", () => {
    const root = mkdtempSync(path.join(tmpdir(), "atlas-baseline-import-"));
    const current = path.join(root, "baseline");
    const staged = path.join(root, "staged-baseline");
    mkdirSync(current);
    mkdirSync(staged);
    writeFileSync(path.join(current, "stale.png"), "stale");
    writeFileSync(path.join(staged, "current.png"), "current");
    writeFileSync(
      path.join(staged, "baseline.json"),
      JSON.stringify({ version: 1, count: 1, approvedAt: "2026-07-13" }),
    );

    expect(replaceImportedAtlasBaseline(staged, current)).toBe(1);
    expect(existsSync(path.join(current, "stale.png"))).toBe(false);
    expect(readFileSync(path.join(current, "current.png"), "utf8")).toBe(
      "current",
    );
  });

  it("keeps the existing baseline when the staged import is invalid", () => {
    const root = mkdtempSync(path.join(tmpdir(), "atlas-baseline-invalid-"));
    const current = path.join(root, "baseline");
    const staged = path.join(root, "staged-baseline");
    mkdirSync(current);
    mkdirSync(staged);
    writeFileSync(path.join(current, "current.png"), "keep");
    writeFileSync(
      path.join(current, "baseline.json"),
      JSON.stringify({ version: 1, count: 1 }),
    );
    writeFileSync(
      path.join(staged, "baseline.json"),
      JSON.stringify({ version: 1, count: 2 }),
    );

    expect(() => replaceImportedAtlasBaseline(staged, current)).toThrow(
      "contains 0 screenshots; expected 2",
    );
    expect(readFileSync(path.join(current, "current.png"), "utf8")).toBe(
      "keep",
    );
  });
});
