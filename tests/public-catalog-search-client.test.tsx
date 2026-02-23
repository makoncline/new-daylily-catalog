import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicCatalogSearchClient } from "@/components/public-catalog-search/public-catalog-search-client";

const mockSetInfiniteData = vi.hoisted(() => vi.fn());
const mockUseInfiniteQuery = vi.hoisted(() => vi.fn());
const mockFetchNextPage = vi.hoisted(() => vi.fn());

const mockReadSnapshot = vi.hoisted(() => vi.fn());
const mockIsSnapshotUsable = vi.hoisted(() => vi.fn());
const mockShouldRevalidateSnapshot = vi.hoisted(() => vi.fn());
const mockSnapshotToInfiniteData = vi.hoisted(() => vi.fn());
const mockPrefetchAndPersist = vi.hoisted(() => vi.fn());
const mockCreateSnapshot = vi.hoisted(() => vi.fn());
const mockWriteSnapshot = vi.hoisted(() => vi.fn());

vi.mock("@/trpc/react", () => ({
  api: {
    useUtils: () => ({
      public: {
        getListings: {
          setInfiniteData: mockSetInfiniteData,
        },
      },
    }),
    public: {
      getListings: {
        useInfiniteQuery: (...args: unknown[]) => mockUseInfiniteQuery(...args),
      },
    },
  },
}));

vi.mock("@/lib/public-catalog-search-persistence", () => ({
  createPublicCatalogSearchSnapshotFromInfiniteData: (...args: unknown[]) =>
    mockCreateSnapshot(...args),
  isPublicCatalogSearchSnapshotUsable: (...args: unknown[]) =>
    mockIsSnapshotUsable(...args),
  prefetchAndPersistPublicCatalogSearchSnapshot: (...args: unknown[]) =>
    mockPrefetchAndPersist(...args),
  PUBLIC_CATALOG_SEARCH_PERSISTED_SWR: {
    enabled: true,
    queryLimit: 500,
  },
  readPublicCatalogSearchSnapshot: (...args: unknown[]) =>
    mockReadSnapshot(...args),
  snapshotToInfiniteData: (...args: unknown[]) =>
    mockSnapshotToInfiniteData(...args),
  shouldRevalidatePublicCatalogSearchSnapshot: (...args: unknown[]) =>
    mockShouldRevalidateSnapshot(...args),
  writePublicCatalogSearchSnapshot: (...args: unknown[]) =>
    mockWriteSnapshot(...args),
}));

vi.mock("@/components/public-catalog-search/public-catalog-search-content", () => ({
  PublicCatalogSearchContent: () => <div data-testid="catalog-search-content" />,
}));

vi.mock("@/components/view-listing-dialog", () => ({
  ViewListingDialog: () => null,
}));

describe("PublicCatalogSearchClient snapshot revalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSetInfiniteData.mockImplementation(
      (_queryInput: unknown, updater: (previous: unknown) => unknown) => {
        updater(undefined);
      },
    );

    const listing = { id: "listing-1", title: "Alpha" };
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [[listing]],
        pageParams: [undefined],
      },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    mockCreateSnapshot.mockReturnValue({
      userId: "user-1",
      userSlugOrId: "seeded-daylily",
      version: 1,
      persistedAt: new Date().toISOString(),
      limit: 500,
      data: {
        pages: [[listing]],
        pageParams: [null],
      },
    });
  });

  it("hydrates from snapshot without background refetch when snapshot is within revalidate window", async () => {
    const snapshot = {
      userId: "user-1",
      userSlugOrId: "seeded-daylily",
      version: 1,
      persistedAt: new Date().toISOString(),
      limit: 500,
      data: {
        pages: [[{ id: "listing-1", title: "Alpha" }]],
        pageParams: [null],
      },
    };

    mockReadSnapshot.mockResolvedValue(snapshot);
    mockIsSnapshotUsable.mockReturnValue(true);
    mockShouldRevalidateSnapshot.mockReturnValue(false);
    mockSnapshotToInfiniteData.mockReturnValue(snapshot.data);

    render(
      <PublicCatalogSearchClient
        userId="user-1"
        userSlugOrId="seeded-daylily"
        lists={[]}
        initialListings={[]}
        totalListingsCount={1}
      />,
    );

    await waitFor(() => {
      expect(mockSetInfiniteData).toHaveBeenCalled();
    });

    expect(mockPrefetchAndPersist).not.toHaveBeenCalled();
  });

  it("revalidates snapshot in background when snapshot is older than revalidate window", async () => {
    const staleSnapshot = {
      userId: "user-1",
      userSlugOrId: "seeded-daylily",
      version: 1,
      persistedAt: new Date().toISOString(),
      limit: 500,
      data: {
        pages: [[{ id: "listing-1", title: "Alpha" }]],
        pageParams: [null],
      },
    };

    const revalidatedSnapshot = {
      ...staleSnapshot,
      persistedAt: new Date().toISOString(),
      data: {
        pages: [[{ id: "listing-1", title: "Alpha Updated" }]],
        pageParams: [null],
      },
    };

    mockReadSnapshot.mockResolvedValue(staleSnapshot);
    mockIsSnapshotUsable.mockReturnValue(true);
    mockShouldRevalidateSnapshot.mockReturnValue(true);
    mockSnapshotToInfiniteData
      .mockReturnValueOnce(staleSnapshot.data)
      .mockReturnValueOnce(revalidatedSnapshot.data);
    mockPrefetchAndPersist.mockResolvedValue(revalidatedSnapshot);

    render(
      <PublicCatalogSearchClient
        userId="user-1"
        userSlugOrId="seeded-daylily"
        lists={[]}
        initialListings={[]}
        totalListingsCount={1}
      />,
    );

    await waitFor(() => {
      expect(mockPrefetchAndPersist).toHaveBeenCalledWith({
        userId: "user-1",
        userSlugOrId: "seeded-daylily",
        force: true,
      });
    });

    await waitFor(() => {
      expect(mockSnapshotToInfiniteData).toHaveBeenCalledWith(
        revalidatedSnapshot,
      );
    });
  });
});
