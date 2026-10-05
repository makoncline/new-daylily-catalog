"use client";

import { APP_CONFIG } from "@/config/constants";
import { usePro } from "@/hooks/use-pro";
import {
  listsCollection,
  type ListCollectionItem,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { DASHBOARD_DB_QUERY_KEYS } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-keys";
import { useSeededDashboardDbQuery } from "@/app/dashboard/_lib/dashboard-db/use-seeded-dashboard-db-query";

export function useListEligibility() {
  const { isPro, isLoading: isSubscriptionLoading } = usePro();
  const listsQuery = useSeededDashboardDbQuery<ListCollectionItem>({
    query: (q) => q.from({ list: listsCollection }),
    queryKey: DASHBOARD_DB_QUERY_KEYS.lists,
  });
  // Optimistic insert rows have no owner until the server confirms creation.
  const listCount = listsQuery.data.filter((list) => list.userId).length;
  const isEligibilityLoading = isSubscriptionLoading || !listsQuery.isReady;
  const canCreateList =
    !isEligibilityLoading &&
    (isPro || listCount < APP_CONFIG.LIST.FREE_TIER_MAX_LISTS);

  return { canCreateList, isEligibilityLoading, isPro, listCount };
}
