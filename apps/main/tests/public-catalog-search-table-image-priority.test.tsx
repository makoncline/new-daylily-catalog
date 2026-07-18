import { render } from "@testing-library/react";
import type { Table } from "@tanstack/react-table";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublicCatalogSearchTable } from "@/components/public-catalog-search/public-catalog-search-table";
import type { PublicCatalogListing } from "@/components/public-catalog-search/public-catalog-search-types";

const mockListingCard = vi.fn();

vi.mock("@/components/listing-card", () => ({
  ListingCard: ({
    listing,
    priority,
  }: {
    listing: PublicCatalogListing;
    priority?: boolean;
  }) => {
    mockListingCard({ id: listing.id, priority });
    return <div>{listing.id}</div>;
  },
}));

describe("PublicCatalogSearchTable image priority", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { desktopColumns: 2 as const, priorities: [true, true, false, false] },
    { desktopColumns: 3 as const, priorities: [true, true, true, false] },
  ])(
    "prioritizes only the first visible $desktopColumns-column desktop row",
    ({ desktopColumns, priorities }) => {
      const listings = ["first", "second", "third", "fourth"].map((id) => ({
        id,
      })) as PublicCatalogListing[];
      const table = {
        getRowModel: () => ({
          rows: listings.map((original) => ({ original })),
        }),
      } as unknown as Table<PublicCatalogListing>;

      render(
        <PublicCatalogSearchTable
          table={table}
          desktopColumns={desktopColumns}
        />,
      );

      expect(
        mockListingCard.mock.calls.map(([props]) => props.priority),
      ).toEqual(priorities);
    },
  );
});
