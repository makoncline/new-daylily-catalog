"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { TABLE_CONFIG } from "@/config/constants";
import { type Table } from "@tanstack/react-table";

export function useUrlInitialTableState({
  filterableColumnIds,
}: {
  filterableColumnIds?: string[];
} = {}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const pageIndex =
    (Number(searchParams.get("page")) ||
      TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX + 1) - 1;

  const pageSize =
    Number(searchParams.get("size")) ||
    (pathname?.includes("dashboard")
      ? TABLE_CONFIG.PAGINATION.DASHBOARD_PAGE_SIZE_DEFAULT
      : TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE);
  const globalFilter = searchParams.get("q") ?? undefined;

  // Get column filters from URL
  const columnFilters = filterableColumnIds
    ? filterableColumnIds
        .map((id) => {
          const value = searchParams.get(id);
          if (!value) return undefined;
          // If the value contains commas, treat it as an array
          return value.includes(",")
            ? { id, value: value.split(",") }
            : { id, value };
        })
        .filter(
          (
            f,
          ): f is
            | { id: string; value: string }
            | { id: string; value: string[] } => f !== undefined,
        )
    : [];

  return {
    pagination: {
      pageIndex,
      pageSize,
    },
    globalFilter,
    columnFilters,
    meta: {
      filterableColumns: filterableColumnIds,
    },
  };
}

export function useTableUrlSync<TData>(table: Table<TData>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read reactive pagination values (TanStack Table v8 causes rerenders when state changes)
  const pageIndex = table.getState().pagination.pageIndex; // 0-based
  const pageSize = table.getState().pagination.pageSize;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { columnFilters, globalFilter } = table.getState();
  const filterableColumns = table.options.meta?.filterableColumns;

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const pageCount = table.getPageCount();
    const maxPageIndex = pageCount > 0 ? pageCount - 1 : 0;
    const totalRows = table.getCoreRowModel().rows.length;

    if (pageIndex < 0) {
      table.setPageIndex(0);
      return;
    }

    if (pageCount === 0) {
      if (totalRows > 0 && pageIndex !== 0) {
        table.setPageIndex(0);
        return;
      }
    } else if (pageIndex > maxPageIndex) {
      table.setPageIndex(maxPageIndex);
      return;
    }

    const url = new URL(window.location.href);
    const oldParams = new URLSearchParams(window.location.search);

    // Update only the search parameters
    if (pageIndex === TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX) {
      url.searchParams.delete("page");
    } else {
      url.searchParams.set("page", String(pageIndex + 1));
    }

    if (
      pageSize === TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE ||
      pageSize === TABLE_CONFIG.PAGINATION.DASHBOARD_PAGE_SIZE_DEFAULT
    ) {
      url.searchParams.delete("size");
    } else {
      url.searchParams.set("size", String(pageSize));
    }

    // column filters (remove stale first)
    if (Array.isArray(filterableColumns)) {
      for (const key of filterableColumns) url.searchParams.delete(key);
    }
    for (const f of columnFilters ?? []) {
      if (f.value != null && f.value !== "") {
        if (Array.isArray(f.value)) {
          url.searchParams.set(String(f.id), f.value.join(","));
        } else {
          // Safely convert to string for URL params
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          url.searchParams.set(String(f.id), String(f.value));
        }
      }
    }

    // global filter
    if (globalFilter) url.searchParams.set("q", String(globalFilter));
    else url.searchParams.delete("q");

    const newParams = url.searchParams;
    const hasChanges =
      Array.from(oldParams.entries()).some(
        ([key, value]) => newParams.get(key) !== value,
      ) || Array.from(newParams.entries()).some(([key]) => !oldParams.has(key));

    // Only update URL if parameters have actually changed
    if (hasChanges) {
      router.push(url.href, { scroll: false });
    }
  }, [
    pageIndex,
    pageSize,
    pathname,
    router,
    searchParams,
    columnFilters,
    globalFilter,
    filterableColumns,
  ]);
}
