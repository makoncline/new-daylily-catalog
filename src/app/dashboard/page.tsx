"use client";

import { useMemo } from "react";
import { api } from "@/trpc/react";
import { DashboardPageClient } from "./_components/dashboard-page-client";
import { buildDashboardStats } from "@/app/dashboard/_lib/build-dashboard-stats";
import { useDashboardListingReadModel } from "@/app/dashboard/_lib/dashboard-db/use-dashboard-listing-read-model";

export default function DashboardPage() {
  const { listingRows: listings, lists, images } =
    useDashboardListingReadModel();

  const { data: profile = null } = api.dashboardDb.userProfile.get.useQuery(
    undefined,
    {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  );

  const stats = useMemo(
    () =>
      buildDashboardStats({
        listings,
        lists,
        images,
        profile,
      }),
    [images, lists, listings, profile],
  );

  return <DashboardPageClient initialStats={stats} />;
}
