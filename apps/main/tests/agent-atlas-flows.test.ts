import { describe, expect, it } from "vitest";
import {
  ATLAS_FLOWS,
  atlasProjectsForRuntime,
  capturesForState,
  flowCoverage,
  liveStateUrl,
  normalizedCaptureName,
  selectAtlasFlowRun,
} from "../scripts/agent-atlas-flows.mjs";

describe("agent atlas flow manifest", () => {
  it("has unique flows and ordered states for both audiences", () => {
    expect(new Set(ATLAS_FLOWS.map((flow) => flow.id)).size).toBe(
      ATLAS_FLOWS.length,
    );
    expect(new Set(ATLAS_FLOWS.map((flow) => flow.audience))).toEqual(
      new Set(["public", "member"]),
    );
    expect(
      ATLAS_FLOWS.every(
        (flow) =>
          flow.steps.length > 0 &&
          flow.steps.every((step) => step.states.length > 0),
      ),
    ).toBe(true);
  });

  it("counts declared states rather than screenshot variants", () => {
    const flow = {
      steps: [
        {
          title: "Review dashboard",
          states: [
            { title: "Dashboard", captureName: "dashboard-overview" },
            { title: "Failure", captureName: null },
          ],
        },
      ],
    };
    const items = [
      {
        project: "rolling-oaks",
        name: "rolling-oaks-dashboard-overview",
      },
      {
        project: "plant-fancy-gardens",
        name: "plant-fancy-gardens-dashboard-overview",
      },
    ];

    expect(normalizedCaptureName(items[0]!)).toBe("dashboard-overview");
    expect(capturesForState(items, flow.steps[0]!.states[0]!)).toHaveLength(2);
    expect(flowCoverage(flow, items)).toEqual({ captured: 1, total: 2 });
  });

  it("declares a capture for every app-owned flow state", () => {
    const uncaptured = ATLAS_FLOWS.flatMap((flow) =>
      flow.steps.flatMap((step) =>
        step.states
          .filter((state) => !state.captureName)
          .map((state) => `${flow.id} / ${step.title} / ${state.title}`),
      ),
    );

    expect(uncaptured).toEqual([]);
  });

  it("selects only the specs and projects needed to refresh one flow", () => {
    const selection = selectAtlasFlowRun(
      "print-tags",
      [
        {
          project: "rolling-oaks",
          name: "rolling-oaks-dashboard-tag-designer",
        },
        {
          project: "plant-fancy-gardens",
          name: "plant-fancy-gardens-dashboard-overview",
        },
      ],
      [
        {
          file: "authenticated.atlas.ts",
          source: 'captureCheckpoint(page, testInfo, "dashboard-overview")',
        },
        {
          file: "member-operations-flow.atlas.ts",
          source: 'captureCheckpoint(page, testInfo, "dashboard-tag-designer")',
        },
      ],
    );

    expect(selection.flow.id).toBe("print-tags");
    expect(selection.files).toEqual(["member-operations-flow.atlas.ts"]);
    expect(selection.projects).toEqual(["rolling-oaks"]);
    expect(selection.captureNames).toContain("dashboard-tag-designer");
    expect(() => selectAtlasFlowRun("unknown", [], [])).toThrow(
      "Unknown atlas flow",
    );
  });

  it("can select runtime projects before any screenshots exist", () => {
    expect(atlasProjectsForRuntime(true)).toContain("hermetic-new-unpaid");
    expect(atlasProjectsForRuntime(true, true)).toEqual([
      "hermetic-new-unpaid",
      "hermetic-billing-past-due",
      "hermetic-billing-canceled",
      "hermetic-free-at-limit",
      "hermetic-profile-editor",
    ]);
    expect(atlasProjectsForRuntime(false)).toContain("rolling-oaks-ipad");
    expect(atlasProjectsForRuntime(false)).not.toContain("hermetic-new-unpaid");
  });

  it("links gallery cards only to safe local application states", () => {
    expect(
      liveStateUrl({ url: "http://localhost:3012/dashboard/tags?size=20" }),
    ).toBe("http://localhost:3012/dashboard/tags?size=20");
    expect(liveStateUrl({ url: "https://daylilycatalog.com/catalogs" })).toBe(
      null,
    );
  });
});
