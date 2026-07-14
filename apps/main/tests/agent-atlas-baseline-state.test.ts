import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  approveAtlasBaseline,
  initializeAtlasBaseline,
  isAtlasBaselineApproved,
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

    expect(
      initializeAtlasBaseline(captures, baseline, { fullCapture: true }),
    ).toBe(true);
    expect(
      initializeAtlasBaseline(captures, baseline, { fullCapture: true }),
    ).toBe(false);
    expect(
      JSON.parse(readFileSync(path.join(baseline, "baseline.json"), "utf8")),
    ).toMatchObject({
      approved: false,
      source: "first-full-capture",
      count: 1,
    });
    expect(isAtlasBaselineApproved(baseline)).toBe(false);
  });

  it("refuses to initialize from a targeted capture", () => {
    const { captures, baseline } = fixture();

    expect(() => initializeAtlasBaseline(captures, baseline)).toThrow(
      "No complete Atlas baseline exists",
    );
  });

  it("records an explicit approval", () => {
    const { captures, baseline } = fixture();

    expect(approveAtlasBaseline(captures, baseline)).toBe(1);
    expect(
      JSON.parse(readFileSync(path.join(baseline, "baseline.json"), "utf8")),
    ).toMatchObject({ approved: true, count: 1 });
    expect(isAtlasBaselineApproved(baseline)).toBe(true);
  });

  it("treats missing or invalid metadata as unapproved", () => {
    const { baseline } = fixture();
    expect(isAtlasBaselineApproved(baseline)).toBe(false);
    mkdirSync(baseline);
    writeFileSync(path.join(baseline, "baseline.json"), "not json");
    expect(isAtlasBaselineApproved(baseline)).toBe(false);
  });

  it("drops checkpoints whose reviewed removal is being approved", () => {
    const { captures, baseline } = fixture();
    const comparisonPath = path.join(path.dirname(captures), "comparison.json");
    writeFileSync(path.join(captures, "retired.png"), "old image");
    writeFileSync(
      path.join(captures, "retired.json"),
      JSON.stringify({ key: "retired" }),
    );
    writeFileSync(
      comparisonPath,
      JSON.stringify({ results: [{ key: "retired", status: "removed" }] }),
    );

    expect(approveAtlasBaseline(captures, baseline, { comparisonPath })).toBe(
      1,
    );
    expect(existsSync(path.join(captures, "retired.png"))).toBe(false);
    expect(existsSync(path.join(baseline, "retired.png"))).toBe(false);
  });
});
