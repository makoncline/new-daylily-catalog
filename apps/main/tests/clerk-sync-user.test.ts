// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/server/clerk/client", () => ({
  getClerk: async () => ({ users: { getUser: mocks.getUser } }),
}));

vi.mock("@/server/db/kvStore", () => ({
  kvStore: {
    delete: vi.fn(),
    get: mocks.cacheGet,
    set: mocks.cacheSet,
  },
}));

import { getClerkUserData, syncClerkUserToKV } from "@/server/clerk/sync-user";

describe("Clerk user cache synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cacheGet.mockResolvedValue(null);
    mocks.cacheSet.mockResolvedValue(undefined);
  });

  it("stores the Clerk user with its primary email", async () => {
    const clerkUser = {
      id: "user_test",
      firstName: "Ada",
      primaryEmailAddress: { emailAddress: "ada@example.com" },
    };
    mocks.getUser.mockResolvedValue(clerkUser);

    const result = await syncClerkUserToKV("user_test");

    expect(result).toEqual({ ...clerkUser, email: "ada@example.com" });
    expect(mocks.cacheSet).toHaveBeenCalledWith("clerk:user:user_test", result);
  });

  it("rejects users without a primary email", async () => {
    mocks.getUser.mockResolvedValue({
      id: "user_no_email",
      primaryEmailAddress: null,
    });

    await expect(syncClerkUserToKV("user_no_email")).rejects.toThrow(
      "User must have a primary email address",
    );
    expect(mocks.cacheSet).not.toHaveBeenCalled();
  });

  it("propagates Clerk lookup failures", async () => {
    const error = new Error("Clerk unavailable");
    mocks.getUser.mockRejectedValue(error);

    await expect(syncClerkUserToKV("user_error")).rejects.toBe(error);
    expect(mocks.cacheSet).not.toHaveBeenCalled();
  });

  it("returns a cached user without calling Clerk", async () => {
    const cached = { id: "user_cached", email: "cached@example.com" };
    mocks.cacheGet.mockResolvedValue(cached);

    await expect(getClerkUserData("user_cached")).resolves.toBe(cached);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("synchronizes a user on a cache miss", async () => {
    mocks.getUser.mockResolvedValue({
      id: "user_miss",
      primaryEmailAddress: { emailAddress: "miss@example.com" },
    });

    await expect(getClerkUserData("user_miss")).resolves.toMatchObject({
      id: "user_miss",
      email: "miss@example.com",
    });
    expect(mocks.cacheGet).toHaveBeenCalledWith("clerk:user:user_miss");
    expect(mocks.getUser).toHaveBeenCalledWith("user_miss");
  });
});
