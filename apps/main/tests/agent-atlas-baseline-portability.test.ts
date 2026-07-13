import { describe, expect, it } from "vitest";
import {
  baselineArchiveName,
  parseBaselineArgs,
  validateBaselineManifest,
} from "../scripts/agent-atlas-baseline-portability.mjs";

describe("atlas baseline portability", () => {
  it("uses a stable archive name and validates provenance", () => {
    expect(baselineArchiveName).toBe("daylily-agent-atlas-baseline.tar.gz");
    expect(
      validateBaselineManifest({
        version: 1,
        count: 40,
        approvedAt: "2026-07-10T00:00:00.000Z",
      }),
    ).toEqual({
      version: 1,
      count: 40,
      approvedAt: "2026-07-10T00:00:00.000Z",
    });
  });

  it("rejects an unsupported or empty baseline", () => {
    expect(() => validateBaselineManifest({ version: 2, count: 40 })).toThrow(
      "Unsupported baseline manifest",
    );
    expect(() => validateBaselineManifest({ version: 1, count: 0 })).toThrow(
      "Baseline manifest has no screenshots",
    );
  });

  it("ignores pnpm's argument separator", () => {
    expect(parseBaselineArgs(["export", "--", "/tmp/baseline.tar.gz"])).toEqual(
      {
        action: "export",
        archivePath: "/tmp/baseline.tar.gz",
      },
    );
  });
});
