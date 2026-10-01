"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { DashboardDbLoadingScreen } from "@/app/dashboard/_components/dashboard-db-loading-screen";

const DashboardWorkspace = dynamic(
  () => import("@/app/dashboard/dashboard-workspace"),
  {
    ssr: false,
    loading: () => (
      <DashboardDbLoadingScreen status="loading" isExiting={false} />
    ),
  },
);

export function DashboardWorkspaceBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [held, setHeld] = useState(false);
  const holdWorkspace = useCallback((value: boolean) => setHeld(value), []);
  const inDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  return inDashboard || held ? (
    <DashboardWorkspace held={held} holdWorkspace={holdWorkspace}>
      {children}
    </DashboardWorkspace>
  ) : (
    children
  );
}
