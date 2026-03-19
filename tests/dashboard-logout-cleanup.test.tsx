import React from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTRPCProxyClient, type TRPCLink } from "@trpc/client";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRouter } from "@/server/api/root";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { callerLink, withTempAppDb } from "@/lib/test-utils/app-test-db";
import { getQueryClient } from "@/trpc/query-client";
import { api } from "@/trpc/react";

interface MockUseAuthResult {
  userId: string | null;
}

const useAuthMock = vi.hoisted(() => vi.fn<() => MockUseAuthResult>());

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => useAuthMock(),
}));

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

function DashboardProtectedQueriesHarness() {
  api.user.getCurrentUser.useQuery();
  api.stripe.getSubscription.useQuery();
  api.dashboardDb.listing.count.useQuery();

  return <div data-testid="protected-dashboard-queries">mounted</div>;
}

describe("dashboard logout cleanup", () => {
  it("does not refetch protected dashboard queries after logout", async () => {
    await withTempAppDb(async ({ user }) => {
      await clearDashboardDbPersistence();
      useAuthMock.mockReturnValue({ userId: user.id });

      const { db } = await import("@/server/db");

      await db.listing.create({
        data: {
          userId: user.id,
          title: "Alpha",
          slug: `alpha-${crypto.randomUUID()}`,
        },
      });

      let authenticatedUserId: string | null = user.id;

      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller(async () => {
        return {
          db,
          headers: new Headers(),
          _authUser: authenticatedUserId
            ? ({ id: authenticatedUserId } as unknown as TRPCInternalContext["_authUser"])
            : null,
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

      const { DashboardClientWrapper } = await import(
        "@/app/dashboard/_components/dashboard-client-wrapper"
      );
      const { listingsCollection } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );

      const errorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      const view = render(
        <QueryClientProvider client={queryClient}>
          <api.Provider client={trpcClient} queryClient={queryClient}>
            <DashboardClientWrapper>
              <DashboardReadyMarker />
              <DashboardListingsMarker listingsCollection={listingsCollection} />
              <DashboardProtectedQueriesHarness />
            </DashboardClientWrapper>
          </api.Provider>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-ready").textContent).toBe("ready");
        expect(screen.getByTestId("dashboard-listings").textContent).toBe("Alpha");
        expect(screen.getByTestId("protected-dashboard-queries").textContent).toBe(
          "mounted",
        );
      });

      const trackedPaths = [
        "dashboardDb.user.getCurrentUser",
        "dashboardDb.listing.sync",
        "dashboardDb.list.sync",
        "dashboardDb.image.sync",
        "dashboardDb.cultivarReference.sync",
        "user.getCurrentUser",
        "stripe.getSubscription",
        "dashboardDb.listing.count",
      ];
      const beforeLogoutCounts = new Map(
        trackedPaths.map((path) => [path, opCounts.get(path) ?? 0]),
      );

      authenticatedUserId = null;
      useAuthMock.mockReturnValue({ userId: null });

      await act(async () => {
        view.rerender(
          <QueryClientProvider client={queryClient}>
            <api.Provider client={trpcClient} queryClient={queryClient}>
              <DashboardClientWrapper>
                <DashboardReadyMarker />
                <DashboardListingsMarker listingsCollection={listingsCollection} />
                <DashboardProtectedQueriesHarness />
              </DashboardClientWrapper>
            </api.Provider>
          </QueryClientProvider>,
        );

        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      trackedPaths.forEach((path) => {
        expect(opCounts.get(path) ?? 0).toBe(beforeLogoutCounts.get(path));
      });

      const queryCollectionErrors = errorSpy.mock.calls.filter(([firstArg]) => {
        return (
          typeof firstArg === "string" &&
          firstArg.startsWith("[QueryCollection] Error observing query")
        );
      });
      expect(queryCollectionErrors).toHaveLength(0);

      errorSpy.mockRestore();
    });
  });
});
