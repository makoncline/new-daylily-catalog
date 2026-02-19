import { render, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PublicCatalogSearchContent } from "@/components/public-catalog-search/public-catalog-search-content";

const mockTable = {
  getColumn: vi.fn(() => null),
  getState: vi.fn(() => ({
    globalFilter: "",
    columnFilters: [],
  })),
};

vi.mock("@/hooks/use-data-table", () => ({
  useDataTable: () => mockTable,
}));

vi.mock("@/components/data-table/data-table-layout", () => ({
  DataTableLayout: ({
    toolbar,
    pagination,
    noResults,
    children,
  }: {
    toolbar?: ReactNode;
    pagination?: ReactNode;
    noResults?: ReactNode;
    children?: ReactNode;
  }) => (
    <div>
      <div data-testid="layout-toolbar">{toolbar}</div>
      <div data-testid="layout-pagination">{pagination}</div>
      <div data-testid="layout-no-results">{noResults}</div>
      <div data-testid="layout-table">{children}</div>
    </div>
  ),
}));

vi.mock("@/components/data-table/data-table-pagination", () => ({
  DataTablePagination: () => <div data-testid="catalog-pagination" />,
}));

vi.mock("@/components/public-catalog-search/public-catalog-search-table", () => ({
  PublicCatalogSearchTable: () => <div data-testid="catalog-table" />,
}));

describe("PublicCatalogSearchContent", () => {
  it("shows total listing count next to listings heading", () => {
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
});
