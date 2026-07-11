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

    expect(buildAgentLoopPlan(options)).toEqual([
      ["pnpm", ["agent:capture:changed"]],
      ["pnpm", ["agent:checks"]],
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
      ["pnpm", ["agent:capture"]],
      ["pnpm", ["agent:compare"]],
    ]);
    expect(story).toEqual([
      ["pnpm", ["agent:capture:story", "--", "onboarding"]],
    ]);
  });

  it("rejects conflicting selection flags", () => {
    expect(() => parseAgentLoopArgs(["--full", "--story", "public"])).toThrow(
      "Choose either --full or --story",
    );
  });

  it("accepts pnpm's argument separator", () => {
    expect(parseAgentLoopArgs(["--", "--ui-only"]).uiOnly).toBe(true);
  });

  it("adds an opt-in production build timing gate", () => {
    expect(
      buildAgentLoopPlan(parseAgentLoopArgs(["--ui-only", "--build"])),
    ).toEqual([
      ["pnpm", ["agent:capture:changed"]],
      ["pnpm", ["agent:build"]],
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
        "/tmp/data.sqlite",
      ),
    ).toBe(true);
    expect(
      isExpectedAgentLoopRuntime(
        { localDataRuntime: { mode: "hermetic" } },
        "/tmp/data.sqlite",
      ),
    ).toBe(false);
  });
});
