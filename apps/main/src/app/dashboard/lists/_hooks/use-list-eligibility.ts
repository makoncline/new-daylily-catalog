"use client";

import { api } from "@/trpc/react";
import { APP_CONFIG } from "@/config/constants";
import { usePro } from "@/hooks/use-pro";

export function useListEligibility() {
  const { isPro, isLoading: isSubscriptionLoading } = usePro();
  const { data: listCount, isLoading: isListCountLoading } =
    api.dashboardDb.list.count.useQuery();
  const isEligibilityLoading =
    isSubscriptionLoading || isListCountLoading || listCount === undefined;
  const canCreateList =
    !isEligibilityLoading &&
    (isPro || listCount < APP_CONFIG.LIST.FREE_TIER_MAX_LISTS);

  return { canCreateList, isEligibilityLoading, isPro, listCount };
}
