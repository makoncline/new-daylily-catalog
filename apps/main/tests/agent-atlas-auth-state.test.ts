import { describe, expect, it } from "vitest";
import { authStateIsFresh } from "../scripts/agent-atlas-auth-state.mjs";

describe("agent atlas auth reuse", () => {
  it("reuses complete storage states younger than the freshness window", () => {
    expect(
      authStateIsFresh(
        [
          { exists: true, mtimeMs: 9_000 },
          { exists: true, mtimeMs: 8_000 },
        ],
        10_000,
        3_000,
      ),
    ).toBe(true);
  });

  it("refreshes when either persona is missing or stale", () => {
    expect(
      authStateIsFresh(
        [
          { exists: true, mtimeMs: 9_000 },
          { exists: false, mtimeMs: 0 },
        ],
        10_000,
        3_000,
      ),
    ).toBe(false);
    expect(
      authStateIsFresh(
        [
          { exists: true, mtimeMs: 6_000 },
          { exists: true, mtimeMs: 9_000 },
        ],
        10_000,
        3_000,
      ),
    ).toBe(false);
  });
});
