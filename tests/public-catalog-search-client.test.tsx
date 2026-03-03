import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicCatalogSearchClient } from "@/components/public-catalog-search/public-catalog-search-client";
import { type PublicCatalogListing } from "@/components/public-catalog-search/public-catalog-search-types";

const mockUseInfiniteQuery = vi.hoisted(() => vi.fn());
const mockFetchNextPage = vi.hoisted(() => vi.fn());
const mockRenderSearchContent = vi.hoisted(() => vi.fn());
const mockSetInfiniteData = vi.hoisted(() => vi.fn());
const mockInvalidate = vi.hoisted(() => vi.fn());
const mockPrefetchSnapshot = vi.hoisted(() => vi.fn());
const mockSnapshotToInfiniteData = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());

vi.mock("@/trpc/react", () => ({
  api: {
    useUtils: () => ({
      public: {
        getListings: {
          setInfiniteData: mockSetInfiniteData,
          invalidate: mockInvalidate,
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
  PUBLIC_CATALOG_SEARCH_PERSISTED_SWR: {
    enabled: false,
    queryLimit: 500,
  },
  readPublicCatalogSearchSnapshot: vi.fn(),
  isPublicCatalogSearchSnapshotUsable: vi.fn(),
  shouldRevalidatePublicCatalogSearchSnapshot: vi.fn(),
  prefetchAndPersistPublicCatalogSearchSnapshot: mockPrefetchSnapshot,
  snapshotToInfiniteData: mockSnapshotToInfiniteData,
  createPublicCatalogSearchSnapshotFromInfiniteData: vi.fn(),
  writePublicCatalogSearchSnapshot: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: vi.fn(),
  },
}));

vi.mock("@/components/public-catalog-search/public-catalog-search-content", () => ({
  PublicCatalogSearchContent: (props: unknown) => {
    mockRenderSearchContent(props);
    return <div data-testid="catalog-search-content" />;
  },
}));

vi.mock("@/components/view-listing-dialog", () => ({
  ViewListingDialog: () => null,
}));

function getRenderedContentProps() {
  const props = mockRenderSearchContent.mock.lastCall?.[0];

  if (!props || typeof props !== "object") {
    throw new Error("Expected PublicCatalogSearchContent to receive props");
  }

  return props as {
    listings: Array<{ id: string; title: string }>;
    isRefreshingCatalogData: boolean;
    onRefreshCatalogData: (() => void) | undefined;
  };
}

function createListing(id: string, title: string): PublicCatalogListing {
  return { id, title } as PublicCatalogListing;
}

describe("PublicCatalogSearchClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseInfiniteQuery.mockReturnValue({
      data: undefined,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockSetInfiniteData.mockReset();
    mockInvalidate.mockReset();
    mockPrefetchSnapshot.mockReset();
    mockSnapshotToInfiniteData.mockReset();
    mockToastSuccess.mockReset();
  });

  it("falls back to initial listings when query data is not available", () => {
    const initialListings = [
      createListing("listing-1", "Alpha"),
      createListing("listing-2", "Beta"),
    ];

    render(
      <PublicCatalogSearchClient
        userId="user-1"
        userSlugOrId="seeded-daylily"
        lists={[]}
        initialListings={initialListings}
        totalListingsCount={2}
      />,
    );

    const props = getRenderedContentProps();
    expect(props.listings.map((listing) => listing.id)).toEqual([
      "listing-1",
      "listing-2",
    ]);
  });

  it("uses deduplicated/sorted query results when pages are available", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          [
            createListing("listing-b", "Beta"),
            createListing("listing-a", "Alpha"),
          ],
          [createListing("listing-a", "Alpha")],
        ],
        pageParams: [undefined, "listing-a"],
      },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(
      <PublicCatalogSearchClient
        userId="user-1"
        userSlugOrId="seeded-daylily"
        lists={[]}
        initialListings={[]}
        totalListingsCount={2}
      />,
    );

    const props = getRenderedContentProps();
    expect(props.listings.map((listing) => listing.title)).toEqual([
      "Alpha",
      "Beta",
    ]);
  });

  it("fetches the next page when another page is available", async () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [[createListing("listing-1", "Alpha")]],
        pageParams: [undefined],
      },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

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
      expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
    });
  });

  it("refreshes persisted catalog search data when refresh is requested", async () => {
    const refreshedSnapshot = {
      data: {
        pages: [[createListing("listing-1", "Alpha")]],
        pageParams: [null],
      },
    };
    const refreshedInfiniteData = {
      pages: [[createListing("listing-1", "Alpha")]],
      pageParams: [null],
    };
    mockPrefetchSnapshot.mockResolvedValue(refreshedSnapshot);
    mockSnapshotToInfiniteData.mockReturnValue(refreshedInfiniteData);

    render(
      <PublicCatalogSearchClient
        userId="user-1"
        userSlugOrId="seeded-daylily"
        lists={[]}
        initialListings={[]}
        totalListingsCount={1}
      />,
    );

    const props = getRenderedContentProps();
    expect(props.onRefreshCatalogData).toBeTypeOf("function");

    await act(async () => {
      props.onRefreshCatalogData?.();
    });

    await waitFor(() => {
      expect(mockPrefetchSnapshot).toHaveBeenCalledWith({
        userId: "user-1",
        userSlugOrId: "seeded-daylily",
        force: true,
      });
    });

    expect(mockSetInfiniteData).toHaveBeenCalledWith(
      {
        userSlugOrId: "seeded-daylily",
        limit: 500,
      },
      expect.any(Function),
    );
    expect(mockInvalidate).not.toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith("Catalog search data refreshed");
  });
});
