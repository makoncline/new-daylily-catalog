"use client";

import { getQueryClient } from "@/trpc/query-client";
import { setCurrentUserId } from "@/lib/utils/cursor";
import {
  cleanupDashboardDbCollections,
  initializeDashboardDbCollections,
} from "@/app/dashboard/_lib/dashboard-db/dashboard-db-collections";
import {
  persistDashboardDbToPersistence,
  revalidateDashboardDbInBackground,
  resetDashboardRefreshLock,
  tryHydrateDashboardDbFromPersistence,
} from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import { DASHBOARD_DB_QUERY_KEYS } from "./dashboard-db-keys";

interface DashboardDbBootstrapDeps {
  cleanupDashboardDbCollections: () => Promise<void>;
  initializeDashboardDbCollections: (userId: string) => Promise<void>;
  persistDashboardDbToPersistence: (userId: string) => Promise<void>;
  revalidateDashboardDbInBackground: (userId: string) => Promise<void>;
  removeDashboardDbQueries: (queryKey: readonly unknown[]) => void;
  resetDashboardRefreshLock: () => void;
  setCurrentUserId: (userId: string | null) => void;
  tryHydrateDashboardDbFromPersistence: (userId: string) => Promise<boolean>;
}

const dashboardDbBootstrapDeps: DashboardDbBootstrapDeps = {
  cleanupDashboardDbCollections,
  initializeDashboardDbCollections,
  persistDashboardDbToPersistence,
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
    prefetchUserProfile: () => Promise<unknown>;
    userId: string;
  },
  deps: DashboardDbBootstrapDeps = dashboardDbBootstrapDeps,
) {
  const hydrated = await deps.tryHydrateDashboardDbFromPersistence(args.userId);

  if (hydrated) {
    void deps.revalidateDashboardDbInBackground(args.userId);
    await args.prefetchUserProfile();
    return;
  }

  await Promise.all([
    deps.initializeDashboardDbCollections(args.userId),
    args.prefetchUserProfile(),
  ]);
  void deps.persistDashboardDbToPersistence(args.userId);
}
