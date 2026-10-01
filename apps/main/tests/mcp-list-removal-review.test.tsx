import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListListingsTable } from "@/app/dashboard/lists/[listId]/_components/list-listings-table";

const removeListingsFromList = vi.hoisted(() => vi.fn());
const params = vi.hoisted(() => ({ value: "remove=listing-a%2Clisting-b" }));
const reviewData = vi.hoisted(() => ({
  listingRows: [{ id: "listing-a", title: "Amber Daylily" }] as Array<{
    id: string;
    title: string;
  }>,
  lists: [
    {
      id: "list-1",
      title: "Spring",
      listings: [{ id: "listing-a" }],
    },
  ],
}));
const loadMissingList = vi.hoisted(() =>
  vi.fn(async () => {
    const current = reviewData.lists[0]!;
    reviewData.lists = [
      {
        ...current,
        listings: current.listings.some(({ id }) => id === "listing-b")
          ? current.listings
          : [...current.listings, { id: "listing-b" }],
      },
    ];
  }),
);
const loadListingsByIds = vi.hoisted(() =>
  vi.fn(async () => {
    if (!reviewData.listingRows.some(({ id }) => id === "listing-b")) {
      reviewData.listingRows = [
        ...reviewData.listingRows,
        { id: "listing-b", title: "Blue Daylily" },
      ];
    }
  }),
);

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(params.value),
}));
vi.mock(
  "@/app/dashboard/_lib/dashboard-db/use-dashboard-listing-read-model",
  () => ({
    useDashboardListingReadModel: () => ({
      listingRows: reviewData.listingRows,
      lists: reviewData.lists,
    }),
  }),
);
vi.mock("@/app/dashboard/_lib/dashboard-db/lists-collection", () => ({
  removeListingsFromList,
  loadMissingList,
}));
vi.mock("@/app/dashboard/_lib/dashboard-db/listings-collection", () => ({
  loadListingsByIds,
}));
vi.mock("@/app/dashboard/lists/[listId]/_components/columns", () => ({
  getColumns: () => [],
}));
vi.mock("@/hooks/use-data-table", async () => {
  const React = await import("react");
  return {
    useDataTable: ({
      data,
    }: {
      data: Array<{ id: string; title: string }>;
    }) => {
      const [selected, setSelected] = React.useState<Record<string, boolean>>(
        {},
      );
      return {
        selectAll: () =>
          setSelected(Object.fromEntries(data.map((row) => [row.id, true]))),
        selectFirst: () => setSelected({ [data[0]!.id]: true }),
        setGlobalFilter: vi.fn(),
        setColumnFilters: vi.fn(),
        setRowSelection: setSelected,
        resetRowSelection: () => setSelected({}),
        getFilteredSelectedRowModel: () => ({
          rows: data
            .filter((row) => selected[row.id])
            .map((original) => ({ original })),
        }),
      };
    },
  };
});
vi.mock("@/components/data-table/data-table-layout", () => ({
  DataTableLayout: ({
    table,
    toolbar,
  }: {
    table: {
      selectAll: () => void;
      selectFirst: () => void;
      resetRowSelection: () => void;
    };
    toolbar: React.ReactNode;
  }) => (
    <div>
      <button onClick={table.selectAll}>Select all listings</button>
      <button onClick={table.selectFirst}>Select first listing only</button>
      <button onClick={table.resetRowSelection}>Clear selection</button>
      {toolbar}
    </div>
  ),
}));
vi.mock("@/components/data-table/data-table", () => ({
  DataTable: () => null,
}));
vi.mock("@/components/data-table/data-table-pagination", () => ({
  DataTablePagination: () => null,
}));
vi.mock("@/components/data-table", () => ({ DataTableDownload: () => null }));
vi.mock("@/components/data-table/data-table-global-filter", () => ({
  DataTableGlobalFilter: () => null,
}));
vi.mock("@/components/data-table/data-table-filter-reset", () => ({
  DataTableFilterReset: () => null,
}));
vi.mock("@/components/data-table/data-table-view-options", () => ({
  DataTableViewOptions: () => null,
}));
vi.mock("@/components/data-table/data-table-filtered-count", () => ({
  DataTableFilteredCount: () => null,
}));

describe("MCP list removal review link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    params.value = "remove=listing-a%2Clisting-b";
    reviewData.listingRows = [{ id: "listing-a", title: "Amber Daylily" }];
    reviewData.lists = [
      {
        id: "list-1",
        title: "Spring",
        listings: [{ id: "listing-a" }],
      },
    ];
  });

  it("keeps a cancelled review closed after selection changes and remounts", async () => {
    render(<ListListingsTable listId="list-1" />);

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Amber Daylily; Blue Daylily");
    expect(loadMissingList).toHaveBeenCalledWith("list-1");
    expect(loadListingsByIds).toHaveBeenCalledWith(["listing-a", "listing-b"]);
    expect(removeListingsFromList).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(removeListingsFromList).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    fireEvent.click(
      screen.getByRole("button", { name: "Select first listing only" }),
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Select all listings" }),
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Remove 2 selected" }));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(
      "Amber Daylily; Blue Daylily",
    );
    expect(removeListingsFromList).not.toHaveBeenCalled();
  });

  it("opens a new removal review after the previous intent is cleared", async () => {
    const { rerender } = render(<ListListingsTable listId="list-1" />);
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    params.value = "";
    rerender(<ListListingsTable listId="list-1" />);
    params.value = "remove=listing-a%2Clisting-b";
    rerender(<ListListingsTable listId="list-1" />);
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(
      "Amber Daylily; Blue Daylily",
    );
    expect(removeListingsFromList).not.toHaveBeenCalled();
  });

  it("removes a dashboard selection larger than the API batch limit", async () => {
    params.value = "";
    const listingIds = Array.from(
      { length: 25 },
      (_, index) => `listing-${index}`,
    );
    reviewData.listingRows = listingIds.map((id) => ({ id, title: id }));
    reviewData.lists = [
      {
        id: "list-1",
        title: "Spring",
        listings: listingIds.map((id) => ({ id })),
      },
    ];
    render(<ListListingsTable listId="list-1" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Select all listings" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove 25 selected" }));
    expect(removeListingsFromList).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(removeListingsFromList).toHaveBeenCalledTimes(2),
    );
    expect(removeListingsFromList).toHaveBeenNthCalledWith(1, {
      listId: "list-1",
      listingIds: listingIds.slice(0, 20),
    });
    expect(removeListingsFromList).toHaveBeenNthCalledWith(2, {
      listId: "list-1",
      listingIds: listingIds.slice(20),
    });
  });
});
