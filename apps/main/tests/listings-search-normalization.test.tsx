import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useReactTable, type ColumnDef } from "@tanstack/react-table";
import { defaultTableConfig } from "@/lib/table-config";

interface ListingRow {
  title: string;
}

const listingRows: ListingRow[] = [
  { title: "Lillian's" },
  { title: "Café Étude" },
  { title: "Stella de Oro" },
];

const listingColumns: ColumnDef<ListingRow, unknown>[] = [
  {
    id: "title",
    accessorKey: "title",
    filterFn: "fuzzy",
  },
];

function useListingTable(data: ListingRow[]) {
  return useReactTable<ListingRow>({
    ...defaultTableConfig<ListingRow>(),
    data,
    columns: listingColumns,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
  });
}

describe("listings search normalization", () => {
  it("matches apostrophe case and accent variants in global and title column search", () => {
    const { result } = renderHook(() => useListingTable(listingRows));
    const lillianVariants = [
      "lillians",
      "lillian's",
      "lillian\u2019s",
      "lílliáns",
      "Lillians",
      "LiLlIaNs",
    ];
    const cafeVariants = [
      "cafe etude",
      "café étude",
      "caFe ÉtudE",
    ];

    const expectSingleMatch = (expectedTitle: string) => {
      expect(result.current.getFilteredRowModel().rows).toHaveLength(1);
      expect(result.current.getFilteredRowModel().rows[0]?.original.title).toBe(
        expectedTitle,
      );
    };

    lillianVariants.forEach((query) => {
      act(() => {
        result.current.getColumn("title")?.setFilterValue("");
        result.current.setGlobalFilter(query);
      });

      expectSingleMatch("Lillian's");
    });

    lillianVariants.forEach((query) => {
      act(() => {
        result.current.setGlobalFilter("");
        result.current.getColumn("title")?.setFilterValue(query);
      });

      expectSingleMatch("Lillian's");
    });

    cafeVariants.forEach((query) => {
      act(() => {
        result.current.getColumn("title")?.setFilterValue("");
        result.current.setGlobalFilter(query);
      });

      expectSingleMatch("Café Étude");
    });

    cafeVariants.forEach((query) => {
      act(() => {
        result.current.setGlobalFilter("");
        result.current.getColumn("title")?.setFilterValue(query);
      });

      expectSingleMatch("Café Étude");
    });
  });
});
