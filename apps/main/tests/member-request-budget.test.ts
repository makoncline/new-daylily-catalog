import { describe, expect, it } from "vitest";
import { consumeMemberRequestBudget } from "@/server/security/member-request-budget";

describe("member request budget", () => {
  it("bounds each verified client and member pair without a database read", () => {
    const clientId = crypto.randomUUID();
    for (let request = 0; request < 120; request += 1) {
      expect(consumeMemberRequestBudget(clientId, "member-a")).toBe(true);
    }
    expect(consumeMemberRequestBudget(clientId, "member-a")).toBe(false);
    expect(consumeMemberRequestBudget(clientId, "member-b")).toBe(true);
  });
});
