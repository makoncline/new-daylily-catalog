"use client";

import { AuthHandler } from "@/components/auth-handler";
import { type ReactNode } from "react";
import { DashboardDbProvider } from "./dashboard-db-provider";
import { DashboardNavigationGuardProvider } from "@/hooks/use-dashboard-navigation-guard";

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
  return (
    <>
      {/* AuthHandler monitors user authentication state */}
      <AuthHandler />

      {/* Dashboard content */}
      <DashboardNavigationGuardProvider>
        <DashboardDbProvider>{children}</DashboardDbProvider>
      </DashboardNavigationGuardProvider>
    </>
  );
}
