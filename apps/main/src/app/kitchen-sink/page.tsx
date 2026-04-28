"use client";

import { DashboardDbLoadingScreen } from "@/app/dashboard/_components/dashboard-db-loading-screen";

export default function KitchenSinkPage() {
  return <DashboardDbLoadingScreen status="loading" isExiting={false} />;
}
