"use client";

import { Card } from "@/components/ui/card";
import { api, type RouterOutputs } from "@/trpc/react";
import { PageHeader } from "./page-header";

interface DashboardPageClientProps {
  initialStats: RouterOutputs["dashboard"]["getStats"];
}

export function DashboardPageClient({
  initialStats,
}: DashboardPageClientProps) {
  const {
    data: stats,
    isLoading,
    error,
  } = api.dashboard.getStats.useQuery(undefined, {
    initialData: initialStats,
    refetchInterval: 30000,
  });

  return (
    <>
      <PageHeader
        heading="Dashboard"
        text="Welcome to your daylily catalog dashboard"
      />
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-[100px] animate-pulse bg-muted" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          Failed to load dashboard stats
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium">Total Listings</h3>
              <div className="mt-2 text-2xl font-bold">
                {stats.totalListings}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium">Active Lists</h3>
              <div className="mt-2 text-2xl font-bold">{stats.totalLists}</div>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium">Profile Views</h3>
              <div className="mt-2 text-2xl font-bold">
                {stats.profileViews}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium">Total Sales</h3>
              <div className="mt-2 text-2xl font-bold">${stats.totalSales}</div>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <div className="h-[200px] bg-muted/50" />
            </Card>
            <Card>
              <div className="h-[200px] bg-muted/50" />
            </Card>
          </div>
        </>
      )}
    </>
  );
}
