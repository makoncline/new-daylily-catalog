// @vitest-environment jsdom

import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { clearTestTrpcClient, setTestTrpcClient } from "@/trpc/client";
import { fetchDashboardDbSnapshotFromServer } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";

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
});
