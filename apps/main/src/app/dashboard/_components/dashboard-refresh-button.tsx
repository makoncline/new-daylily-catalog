"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";

import { writeCachedSubscription } from "@/hooks/use-persisted-subscription-query";

export function DashboardRefreshButton() {
  const {
    refreshDashboardCatalog,
    status,
    userId,
    isRefreshing: isBackgroundRefreshing,
  } = useDashboardDb();
  const { userId: clerkUserId } = useAuth();
  const utils = api.useUtils();
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const isRefreshing = isBackgroundRefreshing || isManualRefresh;

  const handleRefresh = async () => {
    if (status !== "ready" || !userId) return;
    if (isRefreshing) return;

    setIsManualRefresh(true);
    try {
      await Promise.all([
        refreshDashboardCatalog(),
        utils.dashboardV2.userProfile.get.invalidate(),
        utils.stripe.getSubscription.invalidate(),
      ]);

      const [, subscription] = await Promise.all([
        utils.dashboardV2.userProfile.get.fetch(),
        utils.stripe.getSubscription.fetch(),
      ]);
      if (clerkUserId) {
        writeCachedSubscription(clerkUserId, subscription);
      }

      toast.success("Dashboard refreshed");
    } catch {
      toast.error("Could not refresh your dashboard.", {
        id: "dashboard-refresh-error",
      });
    } finally {
      setIsManualRefresh(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => void handleRefresh()}
      disabled={status !== "ready" || isRefreshing}
      aria-label="Refresh dashboard data"
      data-testid="dashboard-refresh"
      data-state={isRefreshing ? "refreshing" : "idle"}
    >
      <RefreshCw
        className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
      />
    </Button>
  );
}
