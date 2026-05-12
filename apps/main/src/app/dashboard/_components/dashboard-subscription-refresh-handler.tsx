"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/trpc/react";
import { SUBSCRIPTION_SYNCED_PARAM } from "@/lib/utils/safe-redirect";
import { writeCachedSubscription } from "@/hooks/use-persisted-subscription-query";

function hasSubscriptionSyncedParam() {
  if (typeof window === "undefined") return false;

  return (
    new URLSearchParams(window.location.search).get(
      SUBSCRIPTION_SYNCED_PARAM,
    ) === "1"
  );
}

export function DashboardSubscriptionRefreshHandler() {
  const { isLoaded, userId } = useAuth();
  const shouldRefresh = isLoaded && Boolean(userId) && hasSubscriptionSyncedParam();
  const { data: subscription } = api.stripe.getSubscription.useQuery(
    undefined,
    {
      enabled: shouldRefresh,
    },
  );

  useEffect(() => {
    if (!userId || !subscription || !shouldRefresh) {
      return;
    }

    writeCachedSubscription(userId, subscription);

    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete(SUBSCRIPTION_SYNCED_PARAM);
    const nextSearch = nextParams.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [shouldRefresh, subscription, userId]);

  return null;
}
