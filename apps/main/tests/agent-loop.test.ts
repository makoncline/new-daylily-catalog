import { describe, expect, it } from "vitest";
import {
  buildAgentLoopPlan,
  getAgentLoopServerConfig,
  isExpectedAgentLoopRuntime,
  parseAgentLoopArgs,
} from "../scripts/agent-loop-lib.mjs";

describe("agent loop command planning", () => {
  it("defaults to a targeted UI and static verification loop", () => {
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
          "node scripts/agent-related-tests.mjs",
          "pnpm typecheck",
          "pnpm lint",
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

    expect(full).toEqual([
      ["node", ["scripts/run-agent-atlas-full.mjs"]],
      ["node", ["scripts/agent-atlas-compare.mjs"]],
    ]);
    expect(story).toEqual([
      ["node", ["scripts/run-agent-atlas-story.mjs", "onboarding"]],
    ]);
  });

  it("rejects conflicting selection flags", () => {
    expect(() => parseAgentLoopArgs(["--full", "--story", "public"])).toThrow(
      "Choose either --full or --story",
    );
  });

  it("accepts pnpm's argument separator", () => {
    expect(parseAgentLoopArgs(["--", "--ui-only"]).uiOnly).toBe(true);
    expect(parseAgentLoopArgs(["--realistic-data"]).realisticData).toBe(true);
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
      getAgentLoopServerConfig("https://example.com", "/tmp/data.sqlite"),
    ).toThrow("must be a local HTTP URL");

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
