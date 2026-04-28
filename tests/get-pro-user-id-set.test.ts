// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => ({
  keyValue: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/server/db", () => ({
  db: mockDb,
}));

import { getProUserIdSet } from "@/server/db/getProUserIdSet";

describe("getProUserIdSet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves active pro users from subscription KV rows in one bulk query", async () => {
    mockDb.keyValue.findMany.mockResolvedValue([
      {
        key: "stripe:customer:cus_active",
        value: JSON.stringify({ status: "active" }),
      },
      {
        key: "stripe:customer:cus_trialing",
        value: JSON.stringify({ status: "trialing" }),
      },
      {
        key: "stripe:customer:cus_past_due",
        value: JSON.stringify({ status: "past_due" }),
      },
    ]);

    const proUserIds = await getProUserIdSet([
      { id: "user-active", stripeCustomerId: "cus_active" },
      { id: "user-trialing", stripeCustomerId: "cus_trialing" },
      { id: "user-past-due", stripeCustomerId: "cus_past_due" },
      { id: "user-missing-cache", stripeCustomerId: "cus_missing" },
      { id: "user-no-customer", stripeCustomerId: null },
    ]);

    expect(proUserIds).toEqual(new Set(["user-active", "user-trialing"]));
    expect(mockDb.keyValue.findMany).toHaveBeenCalledTimes(1);
    expect(mockDb.keyValue.findMany).toHaveBeenCalledWith({
      where: {
        key: {
          in: [
            "stripe:customer:cus_active",
            "stripe:customer:cus_trialing",
            "stripe:customer:cus_past_due",
            "stripe:customer:cus_missing",
          ],
        },
      },
      select: {
        key: true,
        value: true,
      },
    });
  });

  it("skips the database when no user has a Stripe customer id", async () => {
    const proUserIds = await getProUserIdSet([
      { id: "user-free", stripeCustomerId: null },
    ]);

    expect(proUserIds).toEqual(new Set());
    expect(mockDb.keyValue.findMany).not.toHaveBeenCalled();
  });
});
