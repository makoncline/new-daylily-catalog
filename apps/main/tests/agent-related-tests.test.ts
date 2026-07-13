import { describe, expect, it } from "vitest";
import { selectRelatedTestInputs } from "../scripts/agent-related-tests.mjs";

describe("agent related test selection", () => {
  it("selects changed tests and source dependency inputs", () => {
    expect(
      selectRelatedTestInputs([
        "apps/main/src/components/example.tsx",
        "apps/main/tests/example.test.tsx",
        "apps/main/docs/readme.md",
      ]),
    ).toEqual({
      fullSuite: false,
      directTests: ["tests/example.test.tsx"],
      relatedSources: ["src/components/example.tsx"],
    });
  });

  it("uses the full suite for shared test configuration changes", () => {
    expect(
      selectRelatedTestInputs(["apps/main/vitest.config.ts"]).fullSuite,
    ).toBe(true);
  });
});
