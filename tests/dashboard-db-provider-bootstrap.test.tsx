import React, { StrictMode } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTRPCProxyClient, type TRPCLink } from "@trpc/client";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppRouter } from "@/server/api/root";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { callerLink, withTempAppDb } from "@/lib/test-utils/app-test-db";
import { getQueryClient } from "@/trpc/query-client";
import { api } from "@/trpc/react";

beforeEach(() => {
  localStorage.clear();
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
    { listingsCollection },
    { listsCollection },
    { imagesCollection },
    { cultivarReferencesCollection },
    { resetQueryClient },
  ] = await Promise.all([
    import("@/app/dashboard/_lib/dashboard-db/listings-collection"),
    import("@/app/dashboard/_lib/dashboard-db/lists-collection"),
    import("@/app/dashboard/_lib/dashboard-db/images-collection"),
    import("@/app/dashboard/_lib/dashboard-db/cultivar-references-collection"),
    import("@/trpc/query-client"),
  ]);

  await Promise.all([
    listingsCollection.cleanup(),
    listsCollection.cleanup(),
    imagesCollection.cleanup(),
    cultivarReferencesCollection.cleanup(),
    resetQueryClient(),
  ]);
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
          _authUser:
            { id: user.id } as unknown as TRPCInternalContext["_authUser"],
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

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-ready").textContent).toBe("ready");
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const bootstrapFetchPaths = [
        "dashboardDb.listing.sync",
        "dashboardDb.list.sync",
        "dashboardDb.image.sync",
        "dashboardDb.cultivarReference.sync",
      ];
      const bootstrapFetchCount = bootstrapFetchPaths.reduce((sum, path) => {
        return sum + (opCounts.get(path) ?? 0);
      }, 0);

      expect(opCounts.get("dashboardDb.user.getCurrentUser")).toBe(1);
      expect(opCounts.get("dashboardDb.userProfile.get")).toBe(1);
      expect(bootstrapFetchCount).toBe(4);

      bootstrapFetchPaths.forEach((path) => {
        expect(opCounts.get(path)).toBe(1);
      });

      expect(opCounts.get("dashboardDb.listing.list") ?? 0).toBe(0);
      expect(opCounts.get("dashboardDb.list.list") ?? 0).toBe(0);
      expect(opCounts.get("dashboardDb.image.list") ?? 0).toBe(0);
      expect(opCounts.get("dashboardDb.cultivarReference.listForUserListings") ?? 0).toBe(0);
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
          _authUser:
            { id: user.id } as unknown as TRPCInternalContext["_authUser"],
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
              <DashboardListingsMarker listingsCollection={listingsCollection} />
            </DashboardDbProvider>
          </api.Provider>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-ready").textContent).toBe("ready");
        expect(screen.getByTestId("dashboard-listings").textContent).toBe(
          "Alpha,Beta",
        );
      });

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
                <DashboardListingsMarker listingsCollection={listingsCollection} />
              </DashboardDbProvider>
            </api.Provider>
          </QueryClientProvider>,
        );

        await waitFor(
          () => {
            expect(screen.getByTestId("dashboard-ready").textContent).toBe("ready");
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

  it("bootstraps successfully in React StrictMode", async () => {
    await withTempAppDb(async ({ user }) => {
      await clearDashboardDbPersistence();

      const { db } = await import("@/server/db");

      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller(async () => {
        return {
          db,
          headers: new Headers(),
          _authUser:
            { id: user.id } as unknown as TRPCInternalContext["_authUser"],
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
          expect(screen.getByTestId("dashboard-ready").textContent).toBe("ready");
        },
        { timeout: 1500 },
      );
    });
  });
});
