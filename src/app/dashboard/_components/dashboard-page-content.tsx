"use client";

import { Card } from "@/components/ui/card";
import { api } from "@/trpc/react";

export function DashboardPageContent() {
  // You can add data fetching here using tRPC if needed
  // const { data: stats } = api.dashboard.getStats.useQuery();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-4xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to your daylily catalog dashboard
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium">Total Listings</h3>
          <div className="mt-2 text-2xl font-bold">0</div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium">Active Lists</h3>
          <div className="mt-2 text-2xl font-bold">0</div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium">Profile Views</h3>
          <div className="mt-2 text-2xl font-bold">0</div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium">Total Sales</h3>
          <div className="mt-2 text-2xl font-bold">$0</div>
        </Card>
      </div>
    </div>
  );
}
