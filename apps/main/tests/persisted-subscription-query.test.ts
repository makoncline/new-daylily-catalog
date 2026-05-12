import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readCachedSubscription,
  writeCachedSubscription,
} from "@/hooks/use-persisted-subscription-query";
import type { RouterOutputs } from "@/trpc/react";

type Subscription = RouterOutputs["stripe"]["getSubscription"];

const activeSubscription = {
  status: "active",
} as unknown as Subscription;

describe("persisted subscription cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-12T00:00:00Z"));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("reads fresh cached subscription data for the same user", () => {
    writeCachedSubscription("user-a", activeSubscription);

    expect(readCachedSubscription("user-a")?.data).toEqual(activeSubscription);
    expect(readCachedSubscription("user-b")).toBeUndefined();
  });

  it("keeps using old subscription cache as the initial value", () => {
    writeCachedSubscription("user-a", activeSubscription);

    vi.setSystemTime(new Date("2026-06-12T00:00:00Z"));

    expect(readCachedSubscription("user-a")?.data).toEqual(activeSubscription);
  });

  it("removes malformed cache entries", () => {
    localStorage.setItem("stripe-subscription:1:user-a", "{bad json");

    expect(readCachedSubscription("user-a")).toBeUndefined();
    expect(localStorage.getItem("stripe-subscription:1:user-a")).toBeNull();
  });
});
