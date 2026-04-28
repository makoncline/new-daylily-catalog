import "fake-indexeddb/auto";
import React, { StrictMode } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTRPCProxyClient, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRouter } from "@/server/api/root";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { callerLink, withTempAppDb } from "@/lib/test-utils/app-test-db";
import { getQueryClient } from "@/trpc/query-client";
import { api } from "@/trpc/react";
import { cursorKey } from "@/lib/utils/cursor";

const reportDashboardLoadFailureMock = vi.hoisted(() => vi.fn());

vi.mock(
  "@/app/dashboard/_lib/dashboard-db/dashboard-load-failure-reporting",
  () => ({
    reportDashboardLoadFailure: reportDashboardLoadFailureMock,
  }),
);

beforeEach(async () => {
  localStorage.clear();
  reportDashboardLoadFailureMock.mockClear();
  await resetDashboardDbClientState();
  await clearDashboardDbPersistence();
});

async function clearDashboardDbPersistence() {
  if (typeof indexedDB === "undefined") {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("new-daylily-catalog");

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to delete IndexedDB database"));
    request.onblocked = () => resolve();
  });
}

function DashboardReadyMarker() {
  return <div data-testid="dashboard-ready">ready</div>;
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
function DashboardListingsMarker({
  listingsCollection,
}: {
  listingsCollection: any;
}) {
  const { data: items = [] } = useLiveQuery((q: any) =>
    q
      .from({ listing: listingsCollection })
      .orderBy(({ listing }: any) => (listing.title ?? "") as string, "asc"),
  );

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

function expectFullSnapshotFetchCounts(opCounts: Map<string, number>) {
  expect(opCounts.get("dashboardDb.bootstrap.roots")).toBe(1);
  expect(opCounts.get("dashboardDb.image.listByListingIds")).toBe(1);
  expect(opCounts.get("dashboardDb.listing.sync") ?? 0).toBe(0);
  expect(opCounts.get("dashboardDb.list.sync") ?? 0).toBe(0);
  expect(opCounts.get("dashboardDb.image.sync") ?? 0).toBe(0);
  expect(opCounts.get("dashboardDb.cultivarReference.sync") ?? 0).toBe(0);
}

describe("dashboardDb provider bootstrap", () => {
  it("cold bootstrap fetches each dashboard collection once", async () => {
    await withTempAppDb(async ({ user }) => {
      await clearDashboardDbPersistence();

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
      const queryClient = getQueryClient();
      const { DashboardDbProvider } = await import(
        "@/app/dashboard/_components/dashboard-db-provider"
      );

      await act(async () => {
        render(
          <QueryClientProvider client={queryClient}>
            <api.Provider client={trpcClient} queryClient={queryClient}>
              <DashboardDbProvider>
                <DashboardReadyMarker />
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
        { timeout: 2000 },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(opCounts.get("dashboardDb.user.getCurrentUser")).toBe(1);
      expect(opCounts.get("dashboardDb.userProfile.get")).toBe(1);
      expectFullSnapshotFetchCounts(opCounts);
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
  });

  it("cold bootstrap still loads complete data when persistence is unavailable", async () => {
    await withTempAppDb(async ({ user }) => {
      await clearDashboardDbPersistence();

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

      const links: TRPCLink<AppRouter>[] = [callerLink(caller)];
      const clientLike = createTRPCProxyClient<AppRouter>({ links });

      const { setTestTrpcClient } = await import("@/trpc/client");
      setTestTrpcClient(clientLike);

      const trpcClient = api.createClient({ links });
      const { DashboardDbProvider } = await import(
        "@/app/dashboard/_components/dashboard-db-provider"
      );
      const { listingsCollection } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );

      const firstQueryClient = getQueryClient();
      const firstRender = render(
        <QueryClientProvider client={firstQueryClient}>
          <api.Provider client={trpcClient} queryClient={firstQueryClient}>
            <DashboardDbProvider>
              <DashboardReadyMarker />
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

      firstRender.unmount();
      await resetDashboardDbClientState();

      const originalIndexedDb = globalThis.indexedDB;
      Object.defineProperty(globalThis, "indexedDB", {
        configurable: true,
        value: undefined,
      });

      try {
        const secondQueryClient = getQueryClient();

        render(
          <QueryClientProvider client={secondQueryClient}>
            <api.Provider client={trpcClient} queryClient={secondQueryClient}>
              <DashboardDbProvider>
                <DashboardReadyMarker />
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
          { timeout: 1500 },
        );
      } finally {
        Object.defineProperty(globalThis, "indexedDB", {
          configurable: true,
          value: originalIndexedDb,
        });
      }
    });
  });

  it("reports dashboard load failures while showing the refresh message", async () => {
    await withTempAppDb(async ({ user }) => {
      await clearDashboardDbPersistence();

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

      const failure = new Error("bootstrap roots failed");
      const failBootstrapRootsLink: TRPCLink<AppRouter> = () => {
        return ({ op, next }) => {
          if (op.path !== "dashboardDb.bootstrap.roots") {
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
      const { DashboardDbProvider } = await import(
        "@/app/dashboard/_components/dashboard-db-provider"
      );

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
        expect(screen.getByText("Please refresh the page.")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("dashboard-ready")).toBeNull();
      expect(reportDashboardLoadFailureMock).toHaveBeenCalledTimes(1);
      expect(reportDashboardLoadFailureMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: failure.message,
          }),
          userId: expect.any(String),
          phase: "cold-bootstrap",
          hydratedSnapshot: false,
          bootstrapActive: true,
        }),
      );
    });
  });

  it("warm bootstrap replaces incomplete persisted data with a full refresh", async () => {
    await withTempAppDb(async ({ user }) => {
      await clearDashboardDbPersistence();

      const { db } = await import("@/server/db");

      const alpha = await db.listing.create({
        data: {
          userId: user.id,
          title: "Alpha",
          slug: `alpha-${crypto.randomUUID()}`,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const beta = await db.listing.create({
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
      let releaseListingSync!: () => void;
      const listingSyncGate = new Promise<void>((resolve) => {
        releaseListingSync = resolve;
      });

      const delayedFullRefreshLink: TRPCLink<AppRouter> = () => {
        return ({ op, next }) =>
          observable((emit) => {
            opCounts.set(op.path, (opCounts.get(op.path) ?? 0) + 1);

            let pending = Promise.resolve();
            const sub = next(op).subscribe({
              next: (value) => {
                pending = pending.then(async () => {
                  if (op.path === "dashboardDb.bootstrap.roots") {
                    await listingSyncGate;
                  }
                  emit.next(value);
                });
              },
              error: (err) => emit.error(err),
              complete: () => {
                void pending.then(() => emit.complete());
              },
            });

            return () => sub.unsubscribe();
          });
      };

      const links: TRPCLink<AppRouter>[] = [
        delayedFullRefreshLink,
        callerLink(caller),
      ];
      const clientLike = createTRPCProxyClient<AppRouter>({ links });

      const { setTestTrpcClient } = await import("@/trpc/client");
      setTestTrpcClient(clientLike);

      const {
        refreshDashboardDbFromServer,
        tryHydrateDashboardDbFromPersistence,
        DASHBOARD_DB_PERSISTED_SWR,
        writeDashboardDbSnapshot,
      } = await import(
        "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
      );
      const { listingsCollection } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );

      await writeDashboardDbSnapshot({
        userId: user.id,
        version: DASHBOARD_DB_PERSISTED_SWR.version,
        persistedAt: new Date(),
        listings: [beta],
        lists: [],
        images: [],
        cultivarReferences: [],
      });

      localStorage.setItem(
        cursorKey("dashboard-db:listings:maxUpdatedAt", user.id),
        beta.updatedAt.toISOString(),
      );

      expect(await tryHydrateDashboardDbFromPersistence(user.id)).toBe(true);

      render(
        <DashboardListingsMarker listingsCollection={listingsCollection} />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-listings").textContent).toBe(
          "Beta",
        );
      });

      const refreshPromise = refreshDashboardDbFromServer(user.id);
      releaseListingSync();
      await act(async () => {
        await refreshPromise;
      });

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-listings").textContent).toBe(
          "Alpha,Beta",
        );
      });

      expectFullSnapshotFetchCounts(opCounts);
      expect(alpha.id).not.toBe(beta.id);
    });
  });

  it("retries a full collection sync after warm revalidation is cancelled", async () => {
    await withTempAppDb(async ({ user }) => {
      await clearDashboardDbPersistence();

      const { db } = await import("@/server/db");

      await db.listing.create({
        data: {
          userId: user.id,
          title: "Alpha",
          slug: `alpha-${crypto.randomUUID()}`,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const beta = await db.listing.create({
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

      const {
        DASHBOARD_DB_PERSISTED_SWR,
        revalidateDashboardDbInBackground,
        tryHydrateDashboardDbFromPersistence,
        writeDashboardDbSnapshot,
      } = await import(
        "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
      );
      const { listingsCollection } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );

      await writeDashboardDbSnapshot({
        userId: user.id,
        version: DASHBOARD_DB_PERSISTED_SWR.version,
        persistedAt: new Date(),
        listings: [beta],
        lists: [],
        images: [],
        cultivarReferences: [],
      });

      localStorage.setItem(
        cursorKey("dashboard-db:listings:maxUpdatedAt", user.id),
        beta.updatedAt.toISOString(),
      );

      expect(await tryHydrateDashboardDbFromPersistence(user.id)).toBe(true);

      await revalidateDashboardDbInBackground(user.id, {
        isActive: () => false,
      });

      render(
        <DashboardListingsMarker listingsCollection={listingsCollection} />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-listings").textContent).toBe(
          "Alpha,Beta",
        );
      });

      expect(opCounts.get("dashboardDb.listing.sync")).toBe(1);
    });
  });

  it("warm bootstrap waits for the profile prefetch before becoming ready", async () => {
    await withTempAppDb(async ({ user }) => {
      await clearDashboardDbPersistence();

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
          headers: new Headers(),
          _authUser: {
            id: user.id,
          } as unknown as TRPCInternalContext["_authUser"],
        };
      });

      const listings = await caller.dashboardDb.listing.sync({ since: null });

      const { DASHBOARD_DB_PERSISTED_SWR, writeDashboardDbSnapshot } =
        await import(
          "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
        );

      await writeDashboardDbSnapshot({
        userId: user.id,
        version: DASHBOARD_DB_PERSISTED_SWR.version,
        persistedAt: new Date(),
        listings,
        lists: [],
        images: [],
        cultivarReferences: [],
      });

      let releaseProfilePrefetch: (() => void) | undefined;
      const profilePrefetchGate = new Promise<void>((resolve) => {
        releaseProfilePrefetch = () => resolve();
      });
      let resolveBackgroundRefresh: (() => void) | undefined;
      const backgroundRefreshComplete = new Promise<void>((resolve) => {
        resolveBackgroundRefresh = () => resolve();
      });
      const opCounts = new Map<string, number>();

      const delayProfileLink: TRPCLink<AppRouter> = () => {
        return ({ op, next }) =>
          observable((emit) => {
            opCounts.set(op.path, (opCounts.get(op.path) ?? 0) + 1);

            let sub:
              | ReturnType<ReturnType<typeof next>["subscribe"]>
              | undefined;
            let cancelled = false;

            void (async () => {
              if (op.path === "dashboardDb.userProfile.get") {
                await profilePrefetchGate;
              }

              if (cancelled) {
                return;
              }

              sub = next(op).subscribe({
                next: (value) => emit.next(value),
                error: (err) => emit.error(err),
                complete: () => {
                  if (op.path === "dashboardDb.image.listByListingIds") {
                    resolveBackgroundRefresh?.();
                  }
                  emit.complete();
                },
              });
            })();

            return () => {
              cancelled = true;
              sub?.unsubscribe();
            };
          });
      };

      const links: TRPCLink<AppRouter>[] = [
        delayProfileLink,
        callerLink(caller),
      ];
      const clientLike = createTRPCProxyClient<AppRouter>({ links });

      const { setTestTrpcClient } = await import("@/trpc/client");
      setTestTrpcClient(clientLike);

      const trpcClient = api.createClient({ links });
      const queryClient = getQueryClient();
      queryClient.clear();
      const { DashboardDbProvider } = await import(
        "@/app/dashboard/_components/dashboard-db-provider"
      );

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
        expect(opCounts.get("dashboardDb.userProfile.get")).toBeGreaterThan(0);
      });

      expect(screen.queryByTestId("dashboard-ready")).toBeNull();

      await act(async () => {
        releaseProfilePrefetch?.();
      });

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-ready").textContent).toBe("ready");
      });

      await act(async () => {
        await backgroundRefreshComplete;
      });
    });
  });

  it("ignores older persisted snapshots and reloads the full catalog", async () => {
    await withTempAppDb(async ({ user }) => {
      await clearDashboardDbPersistence();

      const { db } = await import("@/server/db");

      const alpha = await db.listing.create({
        data: {
          userId: user.id,
          title: "Alpha",
          slug: `alpha-${crypto.randomUUID()}`,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const beta = await db.listing.create({
        data: {
          userId: user.id,
          title: "Beta",
          slug: `beta-${crypto.randomUUID()}`,
        },
      });

      const { writeDashboardDbSnapshot, DASHBOARD_DB_PERSISTED_SWR } =
        await import(
          "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
        );

      expect(DASHBOARD_DB_PERSISTED_SWR.version).toBeGreaterThan(1);

      await writeDashboardDbSnapshot({
        userId: user.id,
        version: 1,
        persistedAt: new Date(),
        listings: [beta],
        lists: [],
        images: [],
        cultivarReferences: [],
      });

      localStorage.setItem(
        cursorKey("dashboard-db:listings:maxUpdatedAt", user.id),
        beta.updatedAt.toISOString(),
      );

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
      const { DashboardDbProvider } = await import(
        "@/app/dashboard/_components/dashboard-db-provider"
      );
      const { listingsCollection } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );

      render(
        <QueryClientProvider client={queryClient}>
          <api.Provider client={trpcClient} queryClient={queryClient}>
            <DashboardDbProvider>
              <DashboardReadyMarker />
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

      expect(alpha.id).not.toBe(beta.id);
    });
  });

  it("bootstraps successfully in React StrictMode", async () => {
    await withTempAppDb(async ({ user }) => {
      await clearDashboardDbPersistence();

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
      const { DashboardDbProvider } = await import(
        "@/app/dashboard/_components/dashboard-db-provider"
      );

      render(
        <StrictMode>
          <QueryClientProvider client={queryClient}>
            <api.Provider client={trpcClient} queryClient={queryClient}>
              <DashboardDbProvider>
                <DashboardReadyMarker />
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
    });
  });
});
