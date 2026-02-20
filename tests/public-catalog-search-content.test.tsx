import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicCatalogSearchContent } from "@/components/public-catalog-search/public-catalog-search-content";

const mockSearchParamGet = vi.fn();
const mockScrollIntoView = vi.fn();
const mockPublicCatalogSearchTable = vi.fn();

const mockTitleColumn = {
  getFilterValue: vi.fn(() => undefined),
  setFilterValue: vi.fn(),
};

const mockListsColumn = {
  getFilterValue: vi.fn(() => undefined),
  setFilterValue: vi.fn(),
};

const mockTable = {
  getColumn: vi.fn((id: string) => {
    if (id === "title") return mockTitleColumn;
    if (id === "lists") return mockListsColumn;
    return null;
  }),
  getState: vi.fn(() => ({
    globalFilter: "",
    columnFilters: [],
  })),
  getRowModel: vi.fn(() => ({ rows: [{ id: "1" }] })),
  getFilteredRowModel: vi.fn(() => ({ rows: [] })),
  getCoreRowModel: vi.fn(() => ({ rows: [] })),
  setGlobalFilter: vi.fn(),
  setSorting: vi.fn(),
  resetPageIndex: vi.fn(),
  resetPagination: vi.fn(),
};

vi.mock("next/navigation", () => ({
  usePathname: () => "/seeded-daylily/search",
  useRouter: () => ({
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: mockSearchParamGet,
    toString: () => "",
  }),
}));

vi.mock("@/hooks/use-data-table", () => ({
  useDataTable: () => mockTable,
}));

vi.mock("@/components/data-table/data-table-pagination", () => ({
  DataTablePagination: () => <div data-testid="catalog-pagination" />,
}));

vi.mock("@/components/public-catalog-search/public-catalog-search-table", () => ({
  PublicCatalogSearchTable: ({
    desktopColumns,
  }: {
    desktopColumns: 2 | 3;
  }) => {
    mockPublicCatalogSearchTable({ desktopColumns });

    return (
      <div
        data-testid="catalog-table"
        data-desktop-columns={String(desktopColumns)}
      />
    );
  },
}));

describe("PublicCatalogSearchContent", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to basic mode and renders mode toggle controls", () => {
    mockSearchParamGet.mockImplementation(() => null);

    render(
      <PublicCatalogSearchContent
        lists={[]}
        listings={[]}
        isLoading={false}
        totalListingsCount={12}
      />,
    );

    expect(screen.getByTestId("search-mode-toggle")).toBeVisible();
    expect(screen.getByTestId("search-mode-switch")).toBeVisible();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("search-all-fields-input")).toBeVisible();
  });

  it("shows total listing count next to listings heading", () => {
    mockSearchParamGet.mockImplementation(() => null);

    render(
      <PublicCatalogSearchContent
        lists={[]}
        listings={[]}
        isLoading={false}
        totalListingsCount={83}
      />,
    );

    expect(screen.getByRole("heading", { name: "Listings" })).toBeVisible();
    expect(screen.getByText("83 total")).toBeVisible();
  });

  it("submitting search form scrolls to results summary", () => {
    mockSearchParamGet.mockImplementation(() => null);

    const scrollElement = document.createElement("div");
    scrollElement.id = "public-search-results-summary";
    scrollElement.scrollIntoView = mockScrollIntoView;
    document.body.appendChild(scrollElement);

    render(
      <PublicCatalogSearchContent
        lists={[]}
        listings={[]}
        isLoading={false}
        totalListingsCount={8}
      />,
    );

    const form = screen.getByTestId("search-query-form");
    form.dispatchEvent(
      new Event("submit", {
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(mockScrollIntoView).toHaveBeenCalled();
    scrollElement.remove();
  });

  it("uses 2 columns with expanded search panel and 3 columns when collapsed", () => {
    mockSearchParamGet.mockImplementation(() => null);

    render(
      <PublicCatalogSearchContent
        lists={[]}
        listings={[]}
        isLoading={false}
        totalListingsCount={8}
      />,
    );

    expect(screen.getByTestId("catalog-table")).toHaveAttribute(
      "data-desktop-columns",
      "2",
    );
    expect(mockPublicCatalogSearchTable).toHaveBeenLastCalledWith({
      desktopColumns: 2,
    });

    fireEvent.click(screen.getByTestId("search-panel-collapse"));

    expect(screen.getByTestId("search-panel-expand")).toBeVisible();
    expect(screen.getByTestId("catalog-table")).toHaveAttribute(
      "data-desktop-columns",
      "3",
    );
    expect(mockPublicCatalogSearchTable).toHaveBeenLastCalledWith({
      desktopColumns: 3,
    });
  });
});
