import { describe, expect, it, vi } from "vitest";
import {
  bootstrapDashboardDbForUser,
  resetDashboardDbForSignedOutUser,
} from "@/app/dashboard/_lib/dashboard-db/dashboard-db-bootstrap";
import { DASHBOARD_DB_QUERY_KEYS } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-keys";

function createBootstrapDeps() {
  return {
    bootstrapDashboardDbFromServer: vi.fn(async (_userId: string) => undefined),
    cleanupDashboardDbCollections: vi.fn(async () => undefined),
    removeDashboardDbQueries: vi.fn(
      (_queryKey: readonly unknown[]) => undefined,
    ),
    resetDashboardRefreshLock: vi.fn(() => undefined),
    setCurrentUserId: vi.fn((_userId: string | null) => undefined),
  };
}

describe("dashboard db bootstrap helpers", () => {
  it("loads the server snapshot on a cold start", async () => {
    const deps = createBootstrapDeps();
    const prefetchUserProfile = vi.fn(async () => undefined);

    await bootstrapDashboardDbForUser(
      {
        prefetchUserProfile,
        userId: "user-2",
      },
      deps,
    );

    expect(deps.setCurrentUserId).toHaveBeenCalledWith("user-2");
    expect(deps.bootstrapDashboardDbFromServer).toHaveBeenCalledWith(
      "user-2",
      undefined,
    );
    expect(prefetchUserProfile).toHaveBeenCalledTimes(1);
  });

  it("cleans up dashboard state when the user signs out", async () => {
    const deps = createBootstrapDeps();

    await resetDashboardDbForSignedOutUser(deps);

    expect(deps.resetDashboardRefreshLock).toHaveBeenCalledTimes(1);
    expect(deps.setCurrentUserId).toHaveBeenCalledWith(null);
    expect(deps.removeDashboardDbQueries).toHaveBeenCalledWith(
      DASHBOARD_DB_QUERY_KEYS.root,
    );
    expect(deps.cleanupDashboardDbCollections).toHaveBeenCalledTimes(1);
  });
});
