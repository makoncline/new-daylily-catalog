"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { api, type RouterOutputs } from "@/trpc/react";

const SUBSCRIPTION_CACHE_VERSION = 1;

type Subscription = RouterOutputs["stripe"]["getSubscription"];

interface CachedSubscription {
  data: Subscription;
  updatedAt: number;
  version: typeof SUBSCRIPTION_CACHE_VERSION;
}

function isCachedSubscription(value: unknown): value is CachedSubscription {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    value.version === SUBSCRIPTION_CACHE_VERSION &&
    "updatedAt" in value &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt) &&
    "data" in value
  );
}

function subscriptionCacheKey(userId: string) {
  return `stripe-subscription:${SUBSCRIPTION_CACHE_VERSION}:${userId}`;
}

export function readCachedSubscription(userId: string) {
  if (typeof window === "undefined") return undefined;

  const raw = window.localStorage.getItem(subscriptionCacheKey(userId));
  if (!raw) return undefined;

  try {
    const cached = JSON.parse(raw) as unknown;
    if (!isCachedSubscription(cached)) {
      window.localStorage.removeItem(subscriptionCacheKey(userId));
      return undefined;
    }
    return cached;
  } catch {
    window.localStorage.removeItem(subscriptionCacheKey(userId));
    return undefined;
  }
}

export function writeCachedSubscription(userId: string, data: Subscription) {
  if (typeof window === "undefined") return;

  const cached: CachedSubscription = {
    data,
    updatedAt: Date.now(),
    version: SUBSCRIPTION_CACHE_VERSION,
  };
  window.localStorage.setItem(
    subscriptionCacheKey(userId),
    JSON.stringify(cached),
  );
}

export function usePersistedSubscriptionQuery() {
  const { isLoaded, userId } = useAuth();
  const cached = useMemo(
    () => (userId ? readCachedSubscription(userId) : undefined),
    [userId],
  );
  const query = api.stripe.getSubscription.useQuery(undefined, {
    enabled: isLoaded && Boolean(userId),
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!userId || query.status !== "success" || query.data === undefined) {
      return;
    }

    writeCachedSubscription(userId, query.data);
  }, [query.data, query.status, userId]);

  return query;
}
