import { describe, expect, it } from "vitest";
import {
  createPublicCatalogSearchSnapshotFromInfiniteData,
  isPublicCatalogSearchSnapshotFresh,
  isPublicCatalogSearchSnapshotUsable,
  PUBLIC_CATALOG_SEARCH_PERSISTED_SWR,
  snapshotToInfiniteData,
  type PublicCatalogInfiniteData,
} from "@/lib/public-catalog-search-persistence";

describe("public catalog search persistence", () => {
  it("round-trips infinite data through snapshot shape", () => {
    const listing = {
      id: "listing-1",
      title: "Alpha",
    } as PublicCatalogInfiniteData["pages"][number][number];

    const data: PublicCatalogInfiniteData = {
      pages: [[listing], []],
      pageParams: [null, "listing-1"],
    };

    const snapshot = createPublicCatalogSearchSnapshotFromInfiniteData({
      userId: "user-1",
      userSlugOrId: "seeded-daylily",
      data,
    });

    const restored = snapshotToInfiniteData(snapshot);

    expect(restored.pages).toEqual(data.pages);
    expect(restored.pageParams).toEqual([null, "listing-1"]);
    expect(snapshot.limit).toBe(PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.queryLimit);
  });

  it("marks snapshots usable by version and fresh by ttl", () => {
    const listing = {
      id: "listing-1",
      title: "Alpha",
    } as PublicCatalogInfiniteData["pages"][number][number];

    const snapshot = createPublicCatalogSearchSnapshotFromInfiniteData({
      userId: "user-1",
      userSlugOrId: "seeded-daylily",
      data: {
        pages: [[listing], []],
        pageParams: [null, "listing-1"],
      },
    });

    expect(isPublicCatalogSearchSnapshotUsable(snapshot)).toBe(true);
    expect(isPublicCatalogSearchSnapshotFresh(snapshot)).toBe(true);

    const staleSnapshot = {
      ...snapshot,
      persistedAt: new Date(
        Date.now() - PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.ttlMs - 1000,
      ).toISOString(),
    };

    expect(isPublicCatalogSearchSnapshotUsable(staleSnapshot)).toBe(true);
    expect(isPublicCatalogSearchSnapshotFresh(staleSnapshot)).toBe(false);
  });
});
