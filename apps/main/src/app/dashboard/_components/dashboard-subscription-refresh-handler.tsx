"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { SUBSCRIPTION_SYNCED_PARAM } from "@/lib/utils/safe-redirect";
import { writeCachedSubscription } from "@/hooks/use-persisted-subscription-query";

export function DashboardSubscriptionRefreshHandler() {
  const { isLoaded, userId } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refetch } = api.stripe.getSubscription.useQuery(undefined, {
    enabled: false,
  });

  useEffect(() => {
    if (
      !isLoaded ||
      !userId ||
      searchParams.get(SUBSCRIPTION_SYNCED_PARAM) !== "1"
    ) {
      return;
    }

    void refetch().then((result) => {
      if (result.data) {
        writeCachedSubscription(userId, result.data);
      }

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete(SUBSCRIPTION_SYNCED_PARAM);
      const nextSearch = nextParams.toString();
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname);
    });
  }, [isLoaded, pathname, refetch, router, searchParams, userId]);

  return null;
}
