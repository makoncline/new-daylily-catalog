"use client";

import { AuthHandler } from "@/components/auth-handler";
import { type ReactNode, useEffect } from "react";
import { DashboardDbProvider } from "./dashboard-db-provider";
import { logDashboardTiming } from "@/app/dashboard/_lib/dashboard-timing";
import { DashboardSubscriptionRefreshHandler } from "@/app/dashboard/_components/dashboard-subscription-refresh-handler";

interface DashboardClientWrapperProps {
  children: ReactNode;
}

/**
 * Client-side wrapper for dashboard content
 * Includes the AuthHandler and initializes the dashboard TanStack DB collections.
 */
export function DashboardClientWrapper({
  children,
}: DashboardClientWrapperProps) {
  useEffect(() => {
    logDashboardTiming("client-wrapper.mounted");
  }, []);

  return (
    <>
      {/* AuthHandler monitors user authentication state */}
      <AuthHandler />
      <DashboardSubscriptionRefreshHandler />

      {/* Dashboard content */}
      <DashboardDbProvider>{children}</DashboardDbProvider>
    </>
  );
}
