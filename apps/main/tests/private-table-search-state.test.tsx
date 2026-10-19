import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDataTable } from "@/hooks/use-data-table";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/tags",
  useRouter: () => ({ push }),
  useSearchParams: () =>
    new URLSearchParams("query=url-search&privateNote=url-note&page=3"),
}));
const columns = [
  {
    id: "privateNote",
    accessorKey: "privateNote",
    filterFn: "includesString" as const,
  },
];

describe("private table search state", () => {
  it("does not read or publish search, filters, or pagination in the URL when disabled", () => {
    push.mockClear();
    const { result } = renderHook(() =>
      useDataTable({
        data: [{ privateNote: "2026 fall purchase" }],
        columns,
        storageKey: "private-table-test",
        syncUrl: false,
      }),
    );
    expect(result.current.getState().globalFilter).toBeUndefined();
    expect(result.current.getState().columnFilters).toEqual([]);
    expect(result.current.getState().pagination.pageIndex).toBe(0);
    act(() => {
      result.current.setGlobalFilter("2026 fall");
      result.current.getColumn("privateNote")!.setFilterValue("purchase");
      result.current.setPageIndex(1);
    });
    expect(result.current.getState().globalFilter).toBe("2026 fall");
    expect(push).not.toHaveBeenCalled();
  });

  it("retains URL-backed search for existing tables", () => {
    push.mockClear();
    const { result } = renderHook(() =>
      useDataTable({ data: [], columns, storageKey: "public-table-test" }),
    );
    expect(result.current.getState().globalFilter).toBe("url-search");
    expect(result.current.getState().columnFilters).toEqual([
      { id: "privateNote", value: "url-note" },
    ]);
    expect(result.current.getState().pagination.pageIndex).toBe(2);
  });
});
