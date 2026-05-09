import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ColumnDef } from "@tanstack/react-table";
import { APP_CONFIG } from "@/config/constants";
import { useDataTable } from "@/hooks/use-data-table";
import {
  getColumns,
  type ListingData,
} from "@/app/dashboard/listings/_components/columns";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/listings",
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

const FILTER_ONLY_COLUMNS = [
  "cultivarName",
  "hasPhoto",
  "linkedToCultivar",
  "parentage",
  "priceValue",
] as const;

function useListingsTableWithPersistedVisibility() {
  return useDataTable({
    data: [],
    columns: getColumns(() => undefined) as ColumnDef<ListingData, unknown>[],
    storageKey: "listings-table",
    initialStateOverrides: {
      pagination: {
        pageSize: APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_DEFAULT,
      },
      columnVisibility: Object.fromEntries(
        FILTER_ONLY_COLUMNS.map((columnId) => [columnId, false]),
      ),
    },
  });
}

describe("dashboard listings table filter-only columns", () => {
  it("keeps new filter-only columns hidden when older column visibility is persisted", () => {
    localStorage.setItem(
      "table-state-listings-table",
      JSON.stringify({
        columnVisibility: {
          description: false,
        },
      }),
    );

    const { result } = renderHook(() => useListingsTableWithPersistedVisibility());

    for (const columnId of FILTER_ONLY_COLUMNS) {
      expect(result.current.getColumn(columnId)?.getIsVisible()).toBe(false);
    }
  });
});
