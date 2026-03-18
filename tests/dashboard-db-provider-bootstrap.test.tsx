import React from "react";
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
});
