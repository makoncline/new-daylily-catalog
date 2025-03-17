"use client";

import { api } from "@/trpc/react";
import { DashboardPageClient } from "./_components/dashboard-page-client";
import { DashboardPageSkeleton } from "./_components/dashboard-page-skeleton";

export default function DashboardPage() {
  // Fetch data on the client side instead of server side
  const { data: initialStats, isLoading } = api.dashboard.getStats.useQuery(
    undefined,
    {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  );

  // Show a loading UI while data is being fetched
  if (isLoading || !initialStats) {
    return <DashboardPageSkeleton />;
  }

  // Pass data to the client component for interactive UI
  return <DashboardPageClient initialStats={initialStats} />;
}
