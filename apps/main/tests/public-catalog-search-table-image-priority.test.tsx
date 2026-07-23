import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Table } from "@tanstack/react-table";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublicCatalogSearchTable } from "@/components/public-catalog-search/public-catalog-search-table";
import type { PublicCatalogListing } from "@/components/public-catalog-search/public-catalog-search-types";

const mockListingCard =
  vi.fn<(props: { id: string; priority?: boolean }) => void>();
const mockOpenListing = vi.fn();

vi.mock("@/components/listing-card", () => ({
  ListingCard: ({
    children,
    listing,
    priority,
  }: {
    children: ReactNode;
    listing: PublicCatalogListing;
    priority?: boolean;
  }) => {
    mockListingCard({ id: listing.id, priority });
    return (
      <div>
        {listing.id}
        {children}
      </div>
    );
  },
  ListingCardAction: (props: React.ComponentProps<"button">) => (
    <button type="button" {...props} />
  ),
}));

vi.mock("@/hooks/use-listing-dialog-query-state", () => ({
  useListingDialogQueryState: () => ({
    openListing: mockOpenListing,
  }),
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

  it("opens a listing dialog from a search result card", () => {
    const listings = [
      {
        id: "listing-1",
        title: "A Green Desire",
      },
    ] as PublicCatalogListing[];
    const table = {
      getRowModel: () => ({
        rows: listings.map((original) => ({ original })),
      }),
    } as unknown as Table<PublicCatalogListing>;

    render(<PublicCatalogSearchTable table={table} desktopColumns={2} />);

    fireEvent.click(
      screen.getByRole("button", { name: "View A Green Desire" }),
    );

    expect(mockOpenListing).toHaveBeenCalledWith("listing-1");
  });
});
