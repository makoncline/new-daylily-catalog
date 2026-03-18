"use client";

import React, { createContext, useCallback, useContext } from "react";
import { api } from "@/trpc/react";
import {
  DashboardDbLoadingScreen,
} from "@/app/dashboard/_components/dashboard-db-loading-screen";
import {
  useDashboardDbBootstrap,
  type DashboardDbState,
} from "@/app/dashboard/_lib/dashboard-db/use-dashboard-db-bootstrap";

const DashboardDbContext = createContext<DashboardDbState | null>(null);

export function useDashboardDb() {
  const value = useContext(DashboardDbContext);
  if (!value) {
    throw new Error("useDashboardDb must be used within DashboardDbProvider");
  }
  return value;
}

export function DashboardDbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const utils = api.useUtils();
  const {
    data: user,
    isLoading,
    isError,
  } = api.dashboardDb.user.getCurrentUser.useQuery();
  const userId = user?.id ?? null;
  const prefetchUserProfile = useCallback(
    () => utils.dashboardDb.userProfile.get.prefetch(),
    [utils.dashboardDb.userProfile.get],
  );
  const { state, hideLoadingScreen, isExitingLoadingScreen } =
    useDashboardDbBootstrap({
      isError,
      isLoading,
      prefetchUserProfile,
      userId,
    });

  return (
    <DashboardDbContext.Provider value={state}>
      {state.status === "ready" ? children : null}

      {hideLoadingScreen ? null : (
        <DashboardDbLoadingScreen
          status={state.status}
          isExiting={isExitingLoadingScreen}
        />
      )}
    </DashboardDbContext.Provider>
  );
}
