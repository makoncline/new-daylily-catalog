import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicCatalogSearchClient } from "@/components/public-catalog-search/public-catalog-search-client";
import { type PublicCatalogListing } from "@/components/public-catalog-search/public-catalog-search-types";

const mockUseInfiniteQuery = vi.hoisted(() => vi.fn());
const mockFetchNextPage = vi.hoisted(() => vi.fn());
const mockRenderSearchContent = vi.hoisted(() => vi.fn());

vi.mock("@/trpc/react", () => ({
  api: {
    public: {
      getListings: {
        useInfiniteQuery: (...args: unknown[]) => mockUseInfiniteQuery(...args),
      },
    },
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
});
