"use client";

import { getQueryClient } from "@/trpc/query-client";
import { setCurrentUserId } from "@/lib/utils/cursor";
import { cleanupDashboardDbCollections } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-collections";
import {
  bootstrapDashboardDbFromServer,
  revalidateDashboardDbInBackground,
  resetDashboardRefreshLock,
  tryHydrateDashboardDbFromPersistence,
} from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import { DASHBOARD_DB_QUERY_KEYS } from "./dashboard-db-keys";

interface DashboardDbBootstrapGuard {
  isActive?: () => boolean;
}

interface DashboardDbBootstrapDeps {
  bootstrapDashboardDbFromServer: (
    userId: string,
    guard?: DashboardDbBootstrapGuard,
  ) => Promise<void>;
  cleanupDashboardDbCollections: () => Promise<void>;
  revalidateDashboardDbInBackground: (
    userId: string,
    guard?: DashboardDbBootstrapGuard,
  ) => Promise<void>;
  removeDashboardDbQueries: (queryKey: readonly unknown[]) => void;
  resetDashboardRefreshLock: () => void;
  setCurrentUserId: (userId: string | null) => void;
  tryHydrateDashboardDbFromPersistence: (userId: string) => Promise<boolean>;
}

const dashboardDbBootstrapDeps: DashboardDbBootstrapDeps = {
  bootstrapDashboardDbFromServer,
  cleanupDashboardDbCollections,
  revalidateDashboardDbInBackground,
  removeDashboardDbQueries: (queryKey) => {
    getQueryClient().removeQueries({ queryKey });
  },
  resetDashboardRefreshLock,
  setCurrentUserId,
  tryHydrateDashboardDbFromPersistence,
};

export async function resetDashboardDbForSignedOutUser(
  deps: DashboardDbBootstrapDeps = dashboardDbBootstrapDeps,
) {
  deps.resetDashboardRefreshLock();
  deps.setCurrentUserId(null);
  deps.removeDashboardDbQueries(DASHBOARD_DB_QUERY_KEYS.root);
  await deps.cleanupDashboardDbCollections();
}

export async function bootstrapDashboardDbForUser(
  args: {
    guard?: DashboardDbBootstrapGuard;
    prefetchUserProfile: () => Promise<unknown>;
    userId: string;
  },
  deps: DashboardDbBootstrapDeps = dashboardDbBootstrapDeps,
) {
  deps.setCurrentUserId(args.userId);
  const hydrated = await deps.tryHydrateDashboardDbFromPersistence(args.userId);

  if (hydrated) {
    void deps.revalidateDashboardDbInBackground(args.userId, args.guard);
    await args.prefetchUserProfile();
    return;
  }

  await Promise.all([
    deps.bootstrapDashboardDbFromServer(args.userId, args.guard),
    args.prefetchUserProfile(),
  ]);
}
