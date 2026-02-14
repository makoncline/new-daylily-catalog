"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";
import { revalidateDashboardDbInBackground } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";

export function DashboardRefreshButton() {
  const { status, userId } = useDashboardDb();
  const utils = api.useUtils();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (status !== "ready" || !userId) return;
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await Promise.all([
        revalidateDashboardDbInBackground(userId),
        utils.dashboardDb.dashboard.getStats.invalidate(),
        utils.dashboardDb.userProfile.get.invalidate(),
      ]);

      await Promise.all([
        utils.dashboardDb.dashboard.getStats.fetch(),
        utils.dashboardDb.userProfile.get.fetch(),
      ]);

      toast.success("Dashboard refreshed");
    } finally {
      setIsRefreshing(false);
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
      <RefreshCw className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
    </Button>
  );
}
