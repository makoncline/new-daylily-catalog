"use server";

import { api } from "@/trpc/server";
import { DashboardPageClient } from "./_components/dashboard-page-client";

export default async function DashboardPage() {
  // Fetch initial data on the server (SSR)
  const initialStats = await api.dashboard.getStats();

  // Pass data to the client component for interactive UI
  // The layout handles all the wrapping, we just provide the content
  return <DashboardPageClient initialStats={initialStats} />;
}
