import { describe, expect, it } from "vitest";
import {
  comparisonIncludes,
  parseComparisonStories,
} from "../scripts/agent-atlas-compare-selection.mjs";

describe("agent atlas comparison selection", () => {
  it("compares everything by default", () => {
    expect(parseComparisonStories([])).toBeNull();
    expect(comparisonIncludes({ story: "public" }, null)).toBe(true);
  });

  it("limits targeted comparisons to selected stories", () => {
    const stories = parseComparisonStories([
      "--stories",
      "public,dashboard-base",
    ]);
    expect(comparisonIncludes({ story: "public" }, stories)).toBe(true);
    expect(comparisonIncludes({ story: "onboarding" }, stories)).toBe(false);
  });
});
