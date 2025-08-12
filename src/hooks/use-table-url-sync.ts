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
  const globalFilter = searchParams.get("query") ?? undefined;

  // Sorting
  const sortId = searchParams.get("sort") ?? undefined;
  const sortDir = searchParams.get("dir") ?? undefined;
  const sorting = sortId
    ? [
        {
          id: sortId,
          desc: sortDir === "desc",
        },
      ]
    : [];

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
    sorting,
    meta: {
      filterableColumns: filterableColumnIds,
    },
  };
}

export function useTableUrlSync<TData>(table: Table<TData>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { pagination, columnFilters, globalFilter, sorting } = table.getState();
  const filterableColumns = table.options.meta?.filterableColumns;

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const oldParams = new URLSearchParams(window.location.search);

    // Update only the search parameters
    if (pagination.pageIndex === TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX) {
      url.searchParams.delete("page");
    } else {
      url.searchParams.set("page", String(pagination.pageIndex + 1));
    }

    if (
      pagination.pageSize === TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE ||
      pagination.pageSize ===
        TABLE_CONFIG.PAGINATION.DASHBOARD_PAGE_SIZE_DEFAULT
    ) {
      url.searchParams.delete("size");
    } else {
      url.searchParams.set("size", String(pagination.pageSize));
    }

    // First, remove all filterable column params that aren't in the current filters
    filterableColumns?.forEach((id) => {
      if (!columnFilters.some((filter) => filter.id === id)) {
        url.searchParams.delete(id);
      }
    });

    // Then set the current column filters
    columnFilters.forEach((filter) => {
      const value = filter.value;
      if (!value) {
        url.searchParams.delete(filter.id);
      } else if (Array.isArray(value)) {
        url.searchParams.set(filter.id, value.join(","));
      } else {
        url.searchParams.set(filter.id, String(value));
      }
    });

    // Sync global filter
    if (!globalFilter) {
      url.searchParams.delete("query");
    } else {
      url.searchParams.set("query", String(globalFilter));
    }

    // Sync sorting (first sort only)
    if (!sorting || sorting.length === 0) {
      url.searchParams.delete("sort");
      url.searchParams.delete("dir");
    } else {
      url.searchParams.set("sort", sorting[0]!.id);
      url.searchParams.set("dir", sorting[0]!.desc ? "desc" : "asc");
    }

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
    pathname,
    router,
    searchParams,
    pagination,
    columnFilters,
    globalFilter,
    sorting,
    filterableColumns,
  ]);
}
