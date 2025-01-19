"use server";

import { DashboardPageSkeleton } from "./_components/dashboard-page-skeleton";

export default async function DashboardLoading() {
  return (
    <>
      <DashboardPageSkeleton />;
    </>
  );
}
