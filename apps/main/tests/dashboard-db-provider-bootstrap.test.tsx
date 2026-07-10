import React, { StrictMode } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTRPCProxyClient, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRouter } from "@/server/api/root";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { callerLink, withTempAppDb } from "@/lib/test-utils/app-test-db";
import { getQueryClient } from "@/trpc/query-client";
import { api } from "@/trpc/react";

const reportDashboardLoadFailureMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() =>
  vi.fn<() => { isLoaded: boolean; userId: string | null }>(() => ({
    isLoaded: true,
    userId: "clerk-user-1",
  })),
);

vi.mock(
  "@/app/dashboard/_lib/dashboard-db/dashboard-load-failure-reporting",
  () => ({
    reportDashboardLoadFailure: reportDashboardLoadFailureMock,
  }),
);

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => useAuthMock(),
}));

beforeEach(async () => {
  localStorage.clear();
  reportDashboardLoadFailureMock.mockClear();
  useAuthMock.mockReturnValue({ isLoaded: true, userId: "clerk-user-1" });
  await resetDashboardDbClientState();
});

afterEach(() => {
  vi.doUnmock("@/app/dashboard/_lib/dashboard-db/dashboard-db-collections");
  vi.doUnmock("@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence");
  vi.doUnmock(
    "@/app/dashboard/_lib/dashboard-db/dashboard-db-sqlite-persistence",
  );
});

function DashboardReadyMarker() {
  return <div data-testid="dashboard-ready">ready</div>;
}

function makeDashboardRefreshingMarker(
  useDashboardDb: () => { isRefreshing: boolean },
) {
  return function DashboardRefreshingMarker() {
    const { isRefreshing } = useDashboardDb();
    return (
      <div data-testid="dashboard-refreshing">
        {isRefreshing ? "refreshing" : "idle"}
      </div>
    );
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
function DashboardListingsMarker({
  listingsCollection,
}: {
  listingsCollection: any;
}) {
  const { data: itemData = [] } = useLiveQuery((q: any) =>
    q
      .from({ listing: listingsCollection })
      .orderBy(({ listing }: any) => (listing.title ?? "") as string, "asc"),
  );
  const items = itemData as any[];

  return (
    <div data-testid="dashboard-listings">
      {items.map((item) => item.title).join(",")}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

async function resetDashboardDbClientState() {
  const [
    { cleanupListingsCollection },
    { cleanupListsCollection },
    { cleanupImagesCollection },
    { cleanupCultivarReferencesCollection },
    { resetDashboardRefreshLock },
    { resetQueryClient },
  ] = await Promise.all([
    import("@/app/dashboard/_lib/dashboard-db/listings-collection"),
    import("@/app/dashboard/_lib/dashboard-db/lists-collection"),
    import("@/app/dashboard/_lib/dashboard-db/images-collection"),
    import("@/app/dashboard/_lib/dashboard-db/cultivar-references-collection"),
    import("@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"),
    import("@/trpc/query-client"),
  ]);

  resetDashboardRefreshLock();
  await Promise.all([
    cleanupListingsCollection(),
    cleanupListsCollection(),
    cleanupImagesCollection(),
    cleanupCultivarReferencesCollection(),
    resetQueryClient(),
  ]);
}

function expectFullSnapshotFetchCounts(
  opCounts: Map<string, number>,
  source: "primary" | "replica" = "primary",
) {
  expect(
    opCounts.get(
      source === "replica"
        ? "dashboardDb.bootstrap.replicaRoots"
        : "dashboardDb.bootstrap.roots",
    ),
  ).toBe(1);
  expect(
    opCounts.get(
      source === "replica"
        ? "dashboardDb.image.listByListingIdsReplica"
        : "dashboardDb.image.listByListingIds",
    ),
  ).toBe(1);
  expect(opCounts.get("dashboardDb.listing.sync") ?? 0).toBe(0);
  expect(opCounts.get("dashboardDb.list.sync") ?? 0).toBe(0);
  expect(opCounts.get("dashboardDb.image.sync") ?? 0).toBe(0);
  expect(opCounts.get("dashboardDb.cultivarReference.sync") ?? 0).toBe(0);
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, reject, resolve };
}

function getBootstrapTestResult(path: string) {
  switch (path) {
    case "dashboardDb.user.getCurrentUserId":
      return { data: { id: "user-1" } };
    case "dashboardDb.userProfile.get":
    case "stripe.getSubscription":
      return { data: null };
    default:
      return undefined;
  }
}

describe("dashboardDb provider bootstrap", () => {
  it("cold bootstrap fetches each dashboard collection once", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");

      await db.listing.create({
        data: {
          userId: user.id,
          title: "Alpha",
          slug: `alpha-${crypto.randomUUID()}`,
        },
      });

      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller(async () => {
        return {
          db,
          hasReplicaDb: true,
          headers: new Headers(),
          replicaDb: db,
          _authUser: {
            id: user.id,
          } as unknown as TRPCInternalContext["_authUser"],
        };
      });

      const opCounts = new Map<string, number>();
      const recordLink: TRPCLink<AppRouter> = () => {
        return ({ op, next }) => {
          opCounts.set(op.path, (opCounts.get(op.path) ?? 0) + 1);
          return next(op);
        };
      };

      const links: TRPCLink<AppRouter>[] = [recordLink, callerLink(caller)];

      const clientLike = createTRPCProxyClient<AppRouter>({ links });

      const { setTestTrpcClient } = await import("@/trpc/client");
      setTestTrpcClient(clientLike);

      const trpcClient = api.createClient({ links });
      const queryClient = getQueryClient();
      const { DashboardDbProvider, useDashboardDb } = await import(
        "@/app/dashboard/_components/dashboard-db-provider"
      );
      const DashboardRefreshingMarker =
        makeDashboardRefreshingMarker(useDashboardDb);

      await act(async () => {
        render(
          <QueryClientProvider client={queryClient}>
            <api.Provider client={trpcClient} queryClient={queryClient}>
              <DashboardDbProvider>
                <DashboardReadyMarker />
                <DashboardRefreshingMarker />
              </DashboardDbProvider>
            </api.Provider>
          </QueryClientProvider>,
        );
      });

      await waitFor(
        () => {
          expect(screen.getByTestId("dashboard-ready").textContent).toBe(
            "ready",
          );
        },
        { timeout: 10_000 },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(opCounts.get("dashboardDb.user.getCurrentUserId")).toBe(1);
      expect(opCounts.get("dashboardDb.userProfile.get")).toBe(1);
      expectFullSnapshotFetchCounts(opCounts, "replica");
      await waitFor(() => {
        expectFullSnapshotFetchCounts(opCounts);
      });
      await waitFor(() => {
        expect(screen.getByTestId("dashboard-refreshing").textContent).toBe(
          "idle",
        );
      });
      expect(opCounts.get("dashboardDb.cultivarReference.getByIds") ?? 0).toBe(
        0,
      );

      expect(opCounts.get("dashboardDb.listing.list") ?? 0).toBe(0);
      expect(opCounts.get("dashboardDb.list.list") ?? 0).toBe(0);
      expect(opCounts.get("dashboardDb.image.list") ?? 0).toBe(0);
      expect(
        opCounts.get("dashboardDb.cultivarReference.listForUserListings") ?? 0,
      ).toBe(0);
    });
  }, 10_000);

  it("cold bootstrap still loads complete data when persistence is unavailable", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");

      await db.listing.create({
        data: {
          userId: user.id,
          title: "Alpha",
          slug: `alpha-${crypto.randomUUID()}`,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await db.listing.create({
        data: {
          userId: user.id,
          title: "Beta",
          slug: `beta-${crypto.randomUUID()}`,
        },
      });

      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller(async () => {
        return {
          db,
          headers: new Headers(),
          _authUser: {
            id: user.id,
          } as unknown as TRPCInternalContext["_authUser"],
        };
      });

      const opCounts = new Map<string, number>();
      const recordLink: TRPCLink<AppRouter> = () => {
        return ({ op, next }) => {
          opCounts.set(op.path, (opCounts.get(op.path) ?? 0) + 1);
          return next(op);
        };
      };
      const links: TRPCLink<AppRouter>[] = [recordLink, callerLink(caller)];
      const clientLike = createTRPCProxyClient<AppRouter>({ links });

      const { setTestTrpcClient } = await import("@/trpc/client");
      setTestTrpcClient(clientLike);

      const trpcClient = api.createClient({ links });
      const { DashboardDbProvider, useDashboardDb } = await import(
        "@/app/dashboard/_components/dashboard-db-provider"
      );
      const DashboardRefreshingMarker =
        makeDashboardRefreshingMarker(useDashboardDb);
      const { listingsCollection } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );

      const queryClient = getQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <api.Provider client={trpcClient} queryClient={queryClient}>
            <DashboardDbProvider>
              <DashboardReadyMarker />
              <DashboardRefreshingMarker />
              <DashboardListingsMarker
                listingsCollection={listingsCollection}
              />
            </DashboardDbProvider>
          </api.Provider>
        </QueryClientProvider>,
      );

      await waitFor(
        () => {
          expect(screen.getByTestId("dashboard-ready").textContent).toBe(
            "ready",
          );
          expect(screen.getByTestId("dashboard-listings").textContent).toBe(
            "Alpha,Beta",
          );
        },
        { timeout: 5000 },
      );
      await waitFor(() => {
        expect(screen.getByTestId("dashboard-refreshing").textContent).toBe(
          "idle",
        );
      });
      expect(opCounts.get("dashboardDb.bootstrap.replicaAvailable")).toBe(1);
      expect(opCounts.get("dashboardDb.bootstrap.replicaRoots") ?? 0).toBe(0);
      expect(
        opCounts.get("dashboardDb.image.listByListingIdsReplica") ?? 0,
      ).toBe(0);
      expectFullSnapshotFetchCounts(opCounts);
    });
  });

  it("reports dashboard load failures while showing the refresh message", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");
      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller(async () => {
        return {
          db,
          hasReplicaDb: true,
          headers: new Headers(),
          replicaDb: db,
          _authUser: {
            id: user.id,
          } as unknown as TRPCInternalContext["_authUser"],
        };
      });

      const failure = new Error("bootstrap roots failed");
      const failBootstrapRootsLink: TRPCLink<AppRouter> = () => {
        return ({ op, next }) => {
          if (op.path !== "dashboardDb.bootstrap.replicaRoots") {
            return next(op);
          }

          return observable((emit) => {
            emit.error(failure as Parameters<typeof emit.error>[0]);
          });
        };
      };

      const links: TRPCLink<AppRouter>[] = [
        failBootstrapRootsLink,
        callerLink(caller),
      ];
      const clientLike = createTRPCProxyClient<AppRouter>({ links });

      const { setTestTrpcClient } = await import("@/trpc/client");
      setTestTrpcClient(clientLike);

      const trpcClient = api.createClient({ links });
      const queryClient = getQueryClient();
      const { DashboardDbProvider, useDashboardDb } = await import(
        "@/app/dashboard/_components/dashboard-db-provider"
      );
      const DashboardRefreshingMarker =
        makeDashboardRefreshingMarker(useDashboardDb);

      render(
        <QueryClientProvider client={queryClient}>
          <api.Provider client={trpcClient} queryClient={queryClient}>
            <DashboardDbProvider>
              <DashboardReadyMarker />
            </DashboardDbProvider>
          </api.Provider>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(
          screen.getByText("Unable to load dashboard data"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("Please refresh the page."),
        ).toBeInTheDocument();
      });

      expect(screen.queryByTestId("dashboard-ready")).toBeNull();
      expect(reportDashboardLoadFailureMock).toHaveBeenCalledTimes(1);
      expect(reportDashboardLoadFailureMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: failure.message,
          }),
          userId: expect.any(String),
          phase: "replica-bootstrap",
          bootstrapActive: true,
        }),
      );
    });
  });

  it("renders warm SQLite data before background refresh finishes", async () => {
    vi.resetModules();
    useAuthMock.mockReturnValue({ isLoaded: true, userId: null });

    const warmHydrate = deferred<{ listingCount: number }>();
    const backgroundRefresh = deferred();
    const bootstrapDashboardDbFromReplica = vi.fn(async () => false);
    const bootstrapDashboardDbFromServer = vi.fn(async () => undefined);
    const hydrateDashboardDbFromSqlitePersistence = vi.fn(
      () => warmHydrate.promise,
    );
    const revalidateDashboardDbInBackground = vi.fn(
      () => backgroundRefresh.promise,
    );

    vi.doMock(
      "@/app/dashboard/_lib/dashboard-db/dashboard-db-sqlite-persistence",
      () => ({
        getDashboardDbSqlitePersistence: vi.fn(async () => ({
          adapter: {},
        })),
      }),
    );
    vi.doMock(
      "@/app/dashboard/_lib/dashboard-db/dashboard-db-collections",
      () => ({
        configureDashboardDbCollectionsPersistence: vi.fn(),
      }),
    );
    vi.doMock(
      "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence",
      () => ({
        bootstrapDashboardDbFromReplica,
        bootstrapDashboardDbFromServer,
        hasFreshDashboardDbSqliteCache: vi.fn(() => true),
        hydrateDashboardDbFromSqlitePersistence,
        revalidateDashboardDbInBackground,
        resetDashboardRefreshLock: vi.fn(),
      }),
    );

    const { DashboardDbProvider, useDashboardDb } = await import(
      "@/app/dashboard/_components/dashboard-db-provider"
    );
    const { api: freshApi } = await import("@/trpc/react");
    const { getQueryClient: getFreshQueryClient } = await import(
      "@/trpc/query-client"
    );

    const trpcClient = freshApi.createClient({
      links: [
        () =>
          ({ op }) =>
            observable((emit) => {
              const result = getBootstrapTestResult(op.path);
              if (result) {
                emit.next({
                  result,
                });
                emit.complete();
                return;
              }

              emit.error(
                new Error(`Unexpected operation ${op.path}`) as Parameters<
                  typeof emit.error
                >[0],
              );
            }),
      ],
    });
    const queryClient = getFreshQueryClient();
    function DashboardRefreshingMarker() {
      const { isRefreshing } = useDashboardDb();
      return (
        <div data-testid="dashboard-refreshing">
          {isRefreshing ? "refreshing" : "idle"}
        </div>
      );
    }

    const renderDashboard = () => (
      <QueryClientProvider client={queryClient}>
        <freshApi.Provider client={trpcClient} queryClient={queryClient}>
          <DashboardDbProvider>
            <DashboardReadyMarker />
            <DashboardRefreshingMarker />
          </DashboardDbProvider>
        </freshApi.Provider>
      </QueryClientProvider>
    );
    const { rerender } = render(renderDashboard());

    await waitFor(() => {
      expect(hydrateDashboardDbFromSqlitePersistence).toHaveBeenCalled();
    });
    expect(screen.queryByTestId("dashboard-ready")).toBeNull();

    await act(async () => {
      warmHydrate.resolve({ listingCount: 1 });
      await warmHydrate.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-ready").textContent).toBe("ready");
    });
    expect(screen.getByTestId("dashboard-refreshing").textContent).toBe(
      "refreshing",
    );
    expect(bootstrapDashboardDbFromReplica).not.toHaveBeenCalled();
    expect(bootstrapDashboardDbFromServer).not.toHaveBeenCalled();
    expect(revalidateDashboardDbInBackground).toHaveBeenCalledTimes(1);

    useAuthMock.mockReturnValue({ isLoaded: true, userId: "clerk-user-1" });
    rerender(renderDashboard());

    await act(async () => {
      backgroundRefresh.resolve();
      await backgroundRefresh.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-refreshing").textContent).toBe(
        "idle",
      );
    });

    const { readCachedSubscription } = await import(
      "@/hooks/use-persisted-subscription-query"
    );
    await waitFor(() => {
      expect(readCachedSubscription("clerk-user-1")?.data).toBeNull();
    });
  });

  it("loads the replica before rendering an empty SQLite cache", async () => {
    vi.resetModules();

    const replicaBootstrap = deferred<boolean>();
    const backgroundRefresh = deferred();
    const bootstrapDashboardDbFromReplica = vi.fn(
      () => replicaBootstrap.promise,
    );
    const bootstrapDashboardDbFromServer = vi.fn(async () => undefined);
    const hydrateDashboardDbFromSqlitePersistence = vi.fn(async () => ({
      listingCount: 0,
    }));
    const revalidateDashboardDbInBackground = vi.fn(
      () => backgroundRefresh.promise,
    );

    vi.doMock(
      "@/app/dashboard/_lib/dashboard-db/dashboard-db-sqlite-persistence",
      () => ({
        getDashboardDbSqlitePersistence: vi.fn(async () => ({
          adapter: {},
        })),
      }),
    );
    vi.doMock(
      "@/app/dashboard/_lib/dashboard-db/dashboard-db-collections",
      () => ({
        configureDashboardDbCollectionsPersistence: vi.fn(),
      }),
    );
    vi.doMock(
      "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence",
      () => ({
        bootstrapDashboardDbFromReplica,
        bootstrapDashboardDbFromServer,
        hasFreshDashboardDbSqliteCache: vi.fn(() => true),
        hydrateDashboardDbFromSqlitePersistence,
        revalidateDashboardDbInBackground,
        resetDashboardRefreshLock: vi.fn(),
      }),
    );

    const { DashboardDbProvider, useDashboardDb } = await import(
      "@/app/dashboard/_components/dashboard-db-provider"
    );
    const { api: freshApi } = await import("@/trpc/react");
    const { getQueryClient: getFreshQueryClient } = await import(
      "@/trpc/query-client"
    );

    const trpcClient = freshApi.createClient({
      links: [
        () =>
          ({ op }) =>
            observable((emit) => {
              const result = getBootstrapTestResult(op.path);
              if (result) {
                emit.next({
                  result,
                });
                emit.complete();
                return;
              }

              emit.error(
                new Error(`Unexpected operation ${op.path}`) as Parameters<
                  typeof emit.error
                >[0],
              );
            }),
      ],
    });
    const queryClient = getFreshQueryClient();
    function DashboardRefreshingMarker() {
      const { isRefreshing } = useDashboardDb();
      return (
        <div data-testid="dashboard-refreshing">
          {isRefreshing ? "refreshing" : "idle"}
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <freshApi.Provider client={trpcClient} queryClient={queryClient}>
          <DashboardDbProvider>
            <DashboardReadyMarker />
            <DashboardRefreshingMarker />
          </DashboardDbProvider>
        </freshApi.Provider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(bootstrapDashboardDbFromReplica).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId("dashboard-ready")).toBeNull();

    await act(async () => {
      replicaBootstrap.resolve(true);
      await replicaBootstrap.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-ready").textContent).toBe("ready");
    });
    expect(screen.getByTestId("dashboard-refreshing").textContent).toBe(
      "refreshing",
    );
    expect(bootstrapDashboardDbFromReplica).toHaveBeenCalledTimes(1);
    expect(bootstrapDashboardDbFromServer).not.toHaveBeenCalled();
    expect(revalidateDashboardDbInBackground).toHaveBeenCalledTimes(1);
    expect(hydrateDashboardDbFromSqlitePersistence).toHaveBeenCalledTimes(1);

    await act(async () => {
      backgroundRefresh.resolve();
      await backgroundRefresh.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-refreshing").textContent).toBe(
        "idle",
      );
    });
  });

  it("renders server data without a background refresh when SQLite and replica are unavailable", async () => {
    vi.resetModules();

    const bootstrapDashboardDbFromReplica = vi.fn(async () => false);
    const bootstrapDashboardDbFromServer = vi.fn(async () => undefined);
    const revalidateDashboardDbInBackground = vi.fn(async () => undefined);

    vi.doMock(
      "@/app/dashboard/_lib/dashboard-db/dashboard-db-sqlite-persistence",
      () => ({
        getDashboardDbSqlitePersistence: vi.fn(async () => null),
      }),
    );
    vi.doMock(
      "@/app/dashboard/_lib/dashboard-db/dashboard-db-collections",
      () => ({
        configureDashboardDbCollectionsPersistence: vi.fn(),
      }),
    );
    vi.doMock(
      "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence",
      () => ({
        bootstrapDashboardDbFromReplica,
        bootstrapDashboardDbFromServer,
        hasFreshDashboardDbSqliteCache: vi.fn(() => false),
        hydrateDashboardDbFromSqlitePersistence: vi.fn(async () => undefined),
        revalidateDashboardDbInBackground,
        resetDashboardRefreshLock: vi.fn(),
      }),
    );

    const { DashboardDbProvider, useDashboardDb } = await import(
      "@/app/dashboard/_components/dashboard-db-provider"
    );
    const { api: freshApi } = await import("@/trpc/react");
    const { getQueryClient: getFreshQueryClient } = await import(
      "@/trpc/query-client"
    );

    const trpcClient = freshApi.createClient({
      links: [
        () =>
          ({ op }) =>
            observable((emit) => {
              const result = getBootstrapTestResult(op.path);
              if (result) {
                emit.next({
                  result,
                });
                emit.complete();
                return;
              }

              emit.error(
                new Error(`Unexpected operation ${op.path}`) as Parameters<
                  typeof emit.error
                >[0],
              );
            }),
      ],
    });
    const queryClient = getFreshQueryClient();
    function DashboardRefreshingMarker() {
      const { isRefreshing } = useDashboardDb();
      return (
        <div data-testid="dashboard-refreshing">
          {isRefreshing ? "refreshing" : "idle"}
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <freshApi.Provider client={trpcClient} queryClient={queryClient}>
          <DashboardDbProvider>
            <DashboardReadyMarker />
            <DashboardRefreshingMarker />
          </DashboardDbProvider>
        </freshApi.Provider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-ready").textContent).toBe("ready");
      expect(screen.getByTestId("dashboard-refreshing").textContent).toBe(
        "idle",
      );
    });
    expect(bootstrapDashboardDbFromReplica).toHaveBeenCalledTimes(1);
    expect(bootstrapDashboardDbFromServer).toHaveBeenCalledTimes(1);
    expect(revalidateDashboardDbInBackground).not.toHaveBeenCalled();

    const { readCachedSubscription } = await import(
      "@/hooks/use-persisted-subscription-query"
    );
    await waitFor(() => {
      expect(readCachedSubscription("clerk-user-1")?.data).toBeNull();
    });
  });

  it("falls back to server bootstrap when warm SQLite hydration fails", async () => {
    vi.resetModules();

    const bootstrapDashboardDbFromReplica = vi.fn(async () => false);
    const bootstrapDashboardDbFromServer = vi.fn(async () => undefined);
    const hydrateDashboardDbFromSqlitePersistence = vi.fn(async () => {
      throw new Error("sqlite hydrate failed");
    });

    vi.doMock(
      "@/app/dashboard/_lib/dashboard-db/dashboard-db-sqlite-persistence",
      () => ({
        getDashboardDbSqlitePersistence: vi.fn(async () => ({
          adapter: {},
        })),
      }),
    );
    vi.doMock(
      "@/app/dashboard/_lib/dashboard-db/dashboard-db-collections",
      () => ({
        configureDashboardDbCollectionsPersistence: vi.fn(),
      }),
    );
    vi.doMock(
      "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence",
      () => ({
        bootstrapDashboardDbFromReplica,
        bootstrapDashboardDbFromServer,
        hasFreshDashboardDbSqliteCache: vi.fn(() => true),
        hydrateDashboardDbFromSqlitePersistence,
        revalidateDashboardDbInBackground: vi.fn(async () => undefined),
        resetDashboardRefreshLock: vi.fn(),
      }),
    );

    const { DashboardDbProvider } = await import(
      "@/app/dashboard/_components/dashboard-db-provider"
    );
    const { api: freshApi } = await import("@/trpc/react");
    const { getQueryClient: getFreshQueryClient } = await import(
      "@/trpc/query-client"
    );

    const trpcClient = freshApi.createClient({
      links: [
        () =>
          ({ op }) =>
            observable((emit) => {
              const result = getBootstrapTestResult(op.path);
              if (result) {
                emit.next({
                  result,
                });
                emit.complete();
                return;
              }

              emit.error(
                new Error(`Unexpected operation ${op.path}`) as Parameters<
                  typeof emit.error
                >[0],
              );
            }),
      ],
    });
    const queryClient = getFreshQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <freshApi.Provider client={trpcClient} queryClient={queryClient}>
          <DashboardDbProvider>
            <DashboardReadyMarker />
          </DashboardDbProvider>
        </freshApi.Provider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-ready").textContent).toBe("ready");
    });

    expect(hydrateDashboardDbFromSqlitePersistence).toHaveBeenCalledTimes(1);
    expect(bootstrapDashboardDbFromReplica).toHaveBeenCalledTimes(1);
    expect(bootstrapDashboardDbFromServer).toHaveBeenCalledTimes(1);
    expect(reportDashboardLoadFailureMock).not.toHaveBeenCalled();
  });

  it("bootstraps successfully in React StrictMode", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");

      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller(async () => {
        return {
          db,
          headers: new Headers(),
          _authUser: {
            id: user.id,
          } as unknown as TRPCInternalContext["_authUser"],
        };
      });

      const links: TRPCLink<AppRouter>[] = [callerLink(caller)];
      const clientLike = createTRPCProxyClient<AppRouter>({ links });

      const { setTestTrpcClient } = await import("@/trpc/client");
      setTestTrpcClient(clientLike);

      const trpcClient = api.createClient({ links });
      const queryClient = getQueryClient();
      const { DashboardDbProvider, useDashboardDb } = await import(
        "@/app/dashboard/_components/dashboard-db-provider"
      );
      const DashboardRefreshingMarker =
        makeDashboardRefreshingMarker(useDashboardDb);

      render(
        <StrictMode>
          <QueryClientProvider client={queryClient}>
            <api.Provider client={trpcClient} queryClient={queryClient}>
              <DashboardDbProvider>
                <DashboardReadyMarker />
                <DashboardRefreshingMarker />
              </DashboardDbProvider>
            </api.Provider>
          </QueryClientProvider>
        </StrictMode>,
      );

      await waitFor(
        () => {
          expect(screen.getByTestId("dashboard-ready").textContent).toBe(
            "ready",
          );
        },
        { timeout: 1500 },
      );
      await waitFor(() => {
        expect(screen.getByTestId("dashboard-refreshing").textContent).toBe(
          "idle",
        );
      });
    });
  });
});
