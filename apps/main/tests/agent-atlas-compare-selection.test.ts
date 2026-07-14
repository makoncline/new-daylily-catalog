import { describe, expect, it } from "vitest";
import {
  comparisonIncludes,
  parseComparisonCaptureNames,
  parseComparisonProjects,
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

  it("limits a flow rerun to its exact capture names", () => {
    const captures = parseComparisonCaptureNames([
      "--captures",
      "dashboard-tag-designer,tag-sheet-preview",
    ]);
    expect(
      comparisonIncludes(
        { name: "dashboard-tag-designer", story: "dashboard-interactions" },
        null,
        captures,
      ),
    ).toBe(true);
    expect(
      comparisonIncludes(
        { name: "create-list-dialog", story: "dashboard-interactions" },
        null,
        captures,
      ),
    ).toBe(false);
    expect(
      comparisonIncludes(
        {
          project: "rolling-oaks",
          name: "rolling-oaks-dashboard-overview",
        },
        null,
        new Set(["dashboard-overview"]),
      ),
    ).toBe(true);
  });

  it("limits a runtime rerun to projects that actually executed", () => {
    const projects = parseComparisonProjects([
      "--projects",
      "rolling-oaks,plant-fancy-gardens",
    ]);

    expect(
      comparisonIncludes(
        { story: "dashboard-base", project: "rolling-oaks" },
        null,
        null,
        projects,
      ),
    ).toBe(true);
    expect(
      comparisonIncludes(
        { story: "dashboard-base", project: "hermetic-new-unpaid" },
        null,
        null,
        projects,
      ),
    ).toBe(false);
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

  it("does not report checkpoints from another runtime as removed", () => {
    expect(
      removedBaselineItems(
        [
          {
            key: "rolling-oaks-dashboard",
            story: "dashboard-base",
            project: "rolling-oaks",
          },
          {
            key: "hermetic-new-unpaid-dashboard",
            story: "dashboard-base",
            project: "hermetic-new-unpaid",
          },
        ],
        [],
        new Set(["dashboard-base"]),
        null,
        new Set(["rolling-oaks"]),
      ),
    ).toEqual([
      {
        key: "rolling-oaks-dashboard",
        story: "dashboard-base",
        project: "rolling-oaks",
      },
    ]);
  });
});
