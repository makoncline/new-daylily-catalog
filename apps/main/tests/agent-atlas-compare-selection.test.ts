import { describe, expect, it } from "vitest";
import {
  comparisonIncludes,
  parseComparisonStories,
  removedBaselineItems,
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

  it("reports baseline checkpoints missing from the current targeted run", () => {
    expect(
      removedBaselineItems(
        [
          { key: "public-old", story: "public" },
          { key: "onboarding-step", story: "onboarding" },
        ],
        [{ key: "public-new" }],
        new Set(["public"]),
      ),
    ).toEqual([{ key: "public-old", story: "public" }]);
  });
});
