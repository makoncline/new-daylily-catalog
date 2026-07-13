import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  approveAtlasBaseline,
  initializeAtlasBaseline,
} from "../scripts/agent-atlas-baseline-state.mjs";

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "agent-atlas-baseline-"));
  const captures = path.join(root, "captures");
  const baseline = path.join(root, "baseline");
  mkdirSync(captures);
  writeFileSync(path.join(captures, "public-home.png"), "image");
  return { captures, baseline };
}

describe("agent atlas local baseline", () => {
  it("bootstraps a clearly unapproved reference only once", () => {
    const { captures, baseline } = fixture();

    expect(initializeAtlasBaseline(captures, baseline)).toBe(true);
    expect(initializeAtlasBaseline(captures, baseline)).toBe(false);
    expect(
      JSON.parse(readFileSync(path.join(baseline, "baseline.json"), "utf8")),
    ).toMatchObject({
      approved: false,
      source: "first-full-capture",
      count: 1,
    });
  });

  it("records an explicit approval", () => {
    const { captures, baseline } = fixture();

    expect(approveAtlasBaseline(captures, baseline)).toBe(1);
    expect(
      JSON.parse(readFileSync(path.join(baseline, "baseline.json"), "utf8")),
    ).toMatchObject({ approved: true, count: 1 });
  });
});
