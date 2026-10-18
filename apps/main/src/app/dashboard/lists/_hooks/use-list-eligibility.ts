"use client";

import { APP_CONFIG } from "@/config/constants";
import { usePro } from "@/hooks/use-pro";

import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";

export function useListEligibility() {
  const { listsCollection } = useDashboardDb();
  const { isPro, isLoading: isSubscriptionLoading } = usePro();
  const listsQuery = useLiveSuspenseQuery({
    query: (q) => q.from({ list: listsCollection }),
  });
  const listCount = listsQuery.data.length;
  const isEligibilityLoading = isSubscriptionLoading;
  const canCreateList =
    !isEligibilityLoading &&
    (isPro || listCount < APP_CONFIG.LIST.FREE_TIER_MAX_LISTS);

  return { canCreateList, isEligibilityLoading, isPro, listCount };
}
