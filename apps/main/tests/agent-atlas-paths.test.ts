import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAtlasRoot,
  getAtlasRuntime,
} from "../scripts/agent-atlas-paths.mjs";

describe("agent atlas runtime paths", () => {
  it("keeps realistic captures canonical and isolates hermetic captures", () => {
    expect(
      getAtlasRoot("/app", { AGENT_ATLAS_RUNTIME: "realistic-data" }),
    ).toBe(path.join("/app", "local", "agent-atlas"));
    expect(getAtlasRoot("/app", { HERMETIC_MODE: "1" })).toBe(
      path.join("/app", "local", "agent-atlas", "runtimes", "hermetic"),
    );
    expect(() => getAtlasRuntime({ AGENT_ATLAS_RUNTIME: "unknown" })).toThrow(
      "Unknown Atlas runtime",
    );
  });
});
