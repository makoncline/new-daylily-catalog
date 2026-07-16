// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  e2eCiGroups,
  getE2eCiGroup,
  validateE2eCiGroups,
} from "../scripts/e2e-ci-groups.mjs";

const cloneGroups = () => structuredClone(e2eCiGroups);

describe("connected E2E CI groups", () => {
  it("assigns every local E2E spec exactly once", () => {
    const { assigned, discovered } = validateE2eCiGroups();
    expect(assigned).toEqual(discovered);
    expect(Object.values(e2eCiGroups).map((group) => group.length)).toEqual([
      4, 5, 5,
    ]);
  });

  it("reports duplicate assignments", () => {
    const groups = cloneGroups();
    groups[2].push(groups[1][0]!);
    expect(() => validateE2eCiGroups({ groups })).toThrow(
      `"duplicates":["${groups[1][0]}"]`,
    );
  });

  it("reports missing assignments", () => {
    const groups = cloneGroups();
    const missing = groups[1].shift()!;
    expect(() => validateE2eCiGroups({ groups })).toThrow(
      `"missing":["${missing}"]`,
    );
  });

  it("reports unknown assignments", () => {
    const groups = cloneGroups();
    groups[1].push("tests/e2e/unknown.e2e.ts");
    expect(() => validateE2eCiGroups({ groups })).toThrow(
      '"unknown":["tests/e2e/unknown.e2e.ts"]',
    );
  });

  it.each([0, 4, "unknown"])("rejects invalid group %s", (group) => {
    expect(() => getE2eCiGroup(group)).toThrow(
      `Expected E2E CI group 1, 2, or 3. Got: ${group}`,
    );
  });
});
