"use client";

import { api } from "@/trpc/react";
import { DashboardPageClient } from "./_components/dashboard-page-client";
import { DashboardPageSkeleton } from "./_components/dashboard-page-skeleton";

export default function DashboardPage() {
  const { data: stats, isLoading } = api.dashboardDb.dashboard.getStats.useQuery();

  // Show a loading UI while data is being fetched
  if (isLoading || !stats) {
    return <DashboardPageSkeleton />;
  }

  // Pass data to the client component for interactive UI
  return <DashboardPageClient initialStats={stats} />;
}
