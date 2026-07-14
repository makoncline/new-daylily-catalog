import { describe, expect, it } from "vitest";
import {
  buildAgentLoopPlan,
  getAgentLoopServerConfig,
  isExpectedAgentLoopRuntime,
  parseAgentLoopArgs,
} from "../scripts/agent-loop-lib.mjs";

describe("agent loop command planning", () => {
  it("defaults to targeted visuals plus complete fast verification", () => {
    const options = parseAgentLoopArgs([]);

    expect(options.realisticData).toBe(false);

    expect(buildAgentLoopPlan(options)).toEqual([
      ["node", ["scripts/run-agent-atlas-changed.mjs"]],
      [
        "pnpm",
        [
          "exec",
          "concurrently",
          "--kill-others-on-fail",
          "--names",
          "tests,typecheck,lint",
          "pnpm exec vitest run --silent=passed-only",
          "pnpm typecheck",
          "pnpm lint",
        ],
      ],
      [
        "pnpm",
        [
          "exec",
          "playwright",
          "test",
          "-c",
          "playwright.integration.config.ts",
        ],
      ],
    ]);
  });

  it("supports full, story-only, and UI-only reruns", () => {
    const full = buildAgentLoopPlan(
      parseAgentLoopArgs(["--full", "--ui-only"]),
    );
    const story = buildAgentLoopPlan(
      parseAgentLoopArgs(["--story", "onboarding", "--ui-only"]),
    );
    const flow = buildAgentLoopPlan(
      parseAgentLoopArgs(["--flow", "print-tags", "--ui-only"]),
    );

    expect(full).toEqual([
      ["node", ["scripts/run-agent-atlas-full.mjs"]],
      ["node", ["scripts/agent-atlas-compare.mjs"]],
    ]);
    expect(story).toEqual([
      ["node", ["scripts/run-agent-atlas-story.mjs", "onboarding"]],
    ]);
    expect(flow).toEqual([
      ["node", ["scripts/run-agent-atlas-flow.mjs", "print-tags"]],
    ]);
  });

  it("rejects conflicting selection flags", () => {
    expect(() => parseAgentLoopArgs(["--full", "--story", "public"])).toThrow(
      "Choose either --full or --story",
    );
    expect(() =>
      parseAgentLoopArgs(["--story", "public", "--flow", "print-tags"]),
    ).toThrow("Choose only one Atlas selection");
  });

  it("accepts pnpm's argument separator", () => {
    expect(parseAgentLoopArgs(["--", "--ui-only"]).uiOnly).toBe(true);
    expect(parseAgentLoopArgs(["--realistic-data"]).realisticData).toBe(true);
  });

  it("adds the complete happy-path E2E gate explicitly", () => {
    const plan = buildAgentLoopPlan(parseAgentLoopArgs(["--e2e"]));

    expect(plan.at(-1)).toEqual(["pnpm", ["test:e2e"]]);
    expect(() => parseAgentLoopArgs(["--ui-only", "--e2e"])).toThrow(
      "--e2e cannot be combined with --ui-only",
    );
  });

  it("only keeps the exploratory server for a UI-only run", () => {
    expect(() => parseAgentLoopArgs(["--keep-server"])).toThrow(
      "--keep-server requires --ui-only",
    );
    expect(parseAgentLoopArgs(["--ui-only", "--keep-server"]).keepServer).toBe(
      true,
    );
  });

  it("adds an opt-in production build timing gate", () => {
    expect(
      buildAgentLoopPlan(parseAgentLoopArgs(["--ui-only", "--build"])),
    ).toEqual([
      ["node", ["scripts/run-agent-atlas-changed.mjs"]],
      ["node", ["scripts/run-agent-local-build.mjs"]],
    ]);
  });

  it("binds and identifies the configured realistic-data server", () => {
    expect(
      getAgentLoopServerConfig("http://localhost:4123", "/tmp/data.sqlite"),
    ).toEqual({ port: "4123", databaseId: "/tmp/data.sqlite" });
    expect(() =>
      getAgentLoopServerConfig("http://127.0.0.1:4123", "/tmp/data.sqlite"),
    ).toThrow("must use http://localhost");
    expect(() =>
      getAgentLoopServerConfig("https://example.com", "/tmp/data.sqlite"),
    ).toThrow("must use http://localhost");

    expect(
      isExpectedAgentLoopRuntime(
        {
          localDataRuntime: {
            mode: "realistic-data",
            databaseId: "/tmp/data.sqlite",
          },
        },
        { mode: "realistic-data", databaseId: "/tmp/data.sqlite" },
      ),
    ).toBe(true);
    expect(
      isExpectedAgentLoopRuntime(
        {
          localDataRuntime: {
            mode: "hermetic",
            databaseId: "/tmp/data.sqlite",
          },
        },
        { mode: "realistic-data", databaseId: "/tmp/data.sqlite" },
      ),
    ).toBe(false);
    expect(
      isExpectedAgentLoopRuntime(
        {
          localDataRuntime: {
            mode: "hermetic",
            databaseId: "/tmp/other.sqlite",
          },
        },
        { mode: "hermetic", databaseId: "/tmp/data.sqlite" },
      ),
    ).toBe(false);
  });
});
