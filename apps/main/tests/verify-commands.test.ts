// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { runVerification, verificationCommands } from "../scripts/verify.mjs";
import { failedRequiredJobs } from "../scripts/verify-pr-results.mjs";
import {
  confidenceCommandsForFlow,
  getAtlasFlow,
} from "../scripts/atlas-flows.mjs";

describe("local verification", () => {
  it("runs lint, types, and focused Vitest files before full-app integration", () => {
    expect(
      verificationCommands(["--tests", "tests/verify-commands.test.ts"]).map(
        ({ display }) => display,
      ),
    ).toEqual([
      "pnpm lint",
      "pnpm typecheck",
      "pnpm main exec vitest run tests/verify-commands.test.ts",
    ]);
    expect(verificationCommands(["--full"]).at(-1)?.display).toBe(
      "node apps/main/scripts/run-integration-local.mjs",
    );
  });

  it("uses Atlas confidence commands for a selected flow", () => {
    const flow = getAtlasFlow("list-management");
    expect(
      verificationCommands(["--flow", flow.id]).map(({ display }) => display),
    ).toEqual(confidenceCommandsForFlow(flow));
  });

  it.each([
    [{ status: 7 }, 7],
    [{ status: null, signal: "SIGTERM" }, 1],
  ])("stops on a failed subprocess", (result, exitCode) => {
    const run = vi.fn(() => result);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(runVerification(verificationCommands([]), run)).toBe(exitCode);
      expect(run).toHaveBeenCalledTimes(1);
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe("required PR result", () => {
  const passed = {
    quality: "success",
    vitest: "success",
    "full-app-integration": "success",
    e2e: "success",
  };

  it("accepts all successful jobs and an expected fork E2E skip", () => {
    expect(failedRequiredJobs(passed, false)).toEqual([]);
    expect(failedRequiredJobs({ ...passed, e2e: "skipped" }, true)).toEqual([]);
  });

  it.each([
    [{ ...passed, e2e: "skipped" }, false, ["e2e"]],
    [{ ...passed, vitest: "failure" }, false, ["vitest"]],
    [
      { ...passed, "full-app-integration": "cancelled" },
      false,
      ["full-app-integration"],
    ],
    [{ ...passed, quality: "skipped" }, true, ["quality"]],
    [{ ...passed, e2e: undefined }, true, ["e2e"]],
  ])(
    "rejects failed, cancelled, missing, and unexpected skipped jobs",
    (results, isFork, failures) => {
      expect(failedRequiredJobs(results, isFork)).toEqual(failures);
    },
  );
});
