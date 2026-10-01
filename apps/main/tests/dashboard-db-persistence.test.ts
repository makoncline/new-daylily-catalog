// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { clearTestTrpcClient, setTestTrpcClient } from "@/trpc/client";
import {
  fetchDashboardDbSnapshotFromServer,
  refreshDashboardDbFromServer,
  resetDashboardRefreshLock,
  runWithDashboardRefreshLock,
} from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import { setCurrentUserId } from "@/lib/utils/cursor";
import { getQueryClient, resetQueryClient } from "@/trpc/query-client";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("dashboard DB persistence bootstrap fetch", () => {
  afterEach(() => {
    clearTestTrpcClient();
  });

  it("fetches roots first and throttles heavy chunks", async () => {
    const now = new Date("2026-04-27T00:00:00.000Z");
    const profileImage = {
      id: "profile-image",
      url: "https://example.com/profile.jpg",
      order: 0,
      listingId: null,
      userProfileId: "profile-1",
      createdAt: now,
      updatedAt: now,
      status: null,
    };
    const listings = Array.from({ length: 2001 }, (_, index) => ({
      id: `listing-${index}`,
      userId: "user-1",
      title: `Listing ${index}`,
      slug: `listing-${index}`,
      price: null,
      description: null,
      privateNote: null,
      status: "PUBLISHED",
      createdAt: now,
      updatedAt: now,
      cultivarReferenceId: `cr-${index}`,
    }));

    const rootsDeferred = deferred<{
      listings: typeof listings;
      lists: never[];
      profileImages: Array<typeof profileImage>;
    }>();
    const started: string[] = [];
    const imageChunks: Array<{ listingIdCount: number }> = [];
    const cultivarChunkSizes: number[] = [];
    let activeHeavyChunks = 0;
    let maxActiveHeavyChunks = 0;

    async function trackHeavyChunk() {
      activeHeavyChunks += 1;
      maxActiveHeavyChunks = Math.max(maxActiveHeavyChunks, activeHeavyChunks);

      await delay(1);
      activeHeavyChunks -= 1;
    }

    setTestTrpcClient({
      dashboardDb: {
        bootstrap: {
          roots: {
            query: () => {
              started.push("roots");
              return rootsDeferred.promise;
            },
          },
        },
        image: {
          listByListingIds: {
            mutate: async (input: { listingIds: string[] }) => {
              imageChunks.push({
                listingIdCount: input.listingIds.length,
              });
              await trackHeavyChunk();
              return [];
            },
          },
        },
        cultivarReference: {
          getByIdsBatch: {
            mutate: async (input: { ids: string[] }) => {
              cultivarChunkSizes.push(input.ids.length);
              await trackHeavyChunk();
              return [];
            },
          },
        },
      },
    } as never);

    const snapshotPromise = fetchDashboardDbSnapshotFromServer();
    await Promise.resolve();

    expect(started).toEqual(["roots"]);

    rootsDeferred.resolve({
      listings,
      lists: [],
      profileImages: [profileImage],
    });

    const snapshot = await snapshotPromise;

    expect(snapshot.listings).toHaveLength(2001);
    expect(snapshot.images).toEqual([profileImage]);
    expect(
      imageChunks.sort((a, b) => b.listingIdCount - a.listingIdCount),
    ).toEqual([
      { listingIdCount: 900 },
      { listingIdCount: 900 },
      { listingIdCount: 201 },
    ]);
    expect(cultivarChunkSizes.sort((a, b) => b - a)).toEqual([
      300, 300, 300, 300, 300, 300, 201,
    ]);
    expect(maxActiveHeavyChunks).toBe(2);
  });

  it.each(["fetching", "queued"] as const)(
    "applies the replacement snapshot when the old refresh is canceled while %s",
    async (phase) => {
      type Snapshot = Awaited<
        ReturnType<typeof fetchDashboardDbSnapshotFromServer>
      >;
      type Roots = Pick<Snapshot, "listings" | "lists"> & {
        profileImages: Snapshot["images"];
      };
      const oldRoots = deferred<Roots>();
      const newRoots = deferred<Roots>();
      const oldSnapshot: Roots = { listings: [], lists: [], profileImages: [] };
      const newSnapshot: Roots = {
        ...oldSnapshot,
        profileImages: [
          {
            id: "saved-image",
            url: "https://example.com/saved.jpg",
            order: 0,
            listingId: null,
            userProfileId: "profile-1",
            createdAt: new Date(),
            updatedAt: new Date(),
            status: null,
          },
        ],
      };
      let fetchCount = 0;
      let oldActive = true;
      setTestTrpcClient({
        dashboardDb: {
          bootstrap: {
            roots: {
              query: () =>
                ++fetchCount === 1 ? oldRoots.promise : newRoots.promise,
            },
          },
        },
      } as never);
      resetDashboardRefreshLock();
      setCurrentUserId("user-1");

      try {
        const releaseLock = deferred<void>();
        const startReplacement = deferred<void>();
        const oldSnapshotReady = deferred<void>();
        let oldGuardCalls = 0;
        let newRefresh: Promise<boolean>;
        const lock =
          phase === "queued"
            ? runWithDashboardRefreshLock(async () => {
                await releaseLock.promise;
                // Start after this work commits, before the canceled queue entry runs.
                queueMicrotask(() =>
                  queueMicrotask(() => {
                    newRefresh = refreshDashboardDbFromServer("user-1", {
                      isActive: () => true,
                    });
                    startReplacement.resolve();
                  }),
                );
              })
            : Promise.resolve();
        const oldRefresh = refreshDashboardDbFromServer("user-1", {
          isActive: () => {
            // The second check follows the fetch, just before queueing.
            if (++oldGuardCalls === 2) oldSnapshotReady.resolve();
            return oldActive;
          },
        });
        if (phase === "queued") {
          oldRoots.resolve(oldSnapshot);
          await oldSnapshotReady.promise;
          oldActive = false;
          releaseLock.resolve();
          await startReplacement.promise;
          await lock;
        } else {
          oldActive = false;
          newRefresh = refreshDashboardDbFromServer("user-1", {
            isActive: () => true,
          });
          oldRoots.resolve(oldSnapshot);
        }
        expect(await oldRefresh).toBe(false);
        newRoots.resolve(newSnapshot);
        expect(await newRefresh!).toBe(true);
        expect(
          getQueryClient().getQueryData(["dashboard-db", "images"]),
        ).toEqual(newSnapshot.profileImages);
      } finally {
        setCurrentUserId(null);
        resetDashboardRefreshLock();
        const collections = await Promise.all([
          import("@/app/dashboard/_lib/dashboard-db/listings-collection"),
          import("@/app/dashboard/_lib/dashboard-db/lists-collection"),
          import("@/app/dashboard/_lib/dashboard-db/images-collection"),
          import(
            "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection"
          ),
        ]);
        await Promise.all([
          collections[0].cleanupListingsCollection(),
          collections[1].cleanupListsCollection(),
          collections[2].cleanupImagesCollection(),
          collections[3].cleanupCultivarReferencesCollection(),
          resetQueryClient(),
        ]);
      }
    },
  );
});
