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

  const pageIndex =
    (Number(searchParams.get("page")) ||
      TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX + 1) - 1;
  const pageSize =
    Number(searchParams.get("size")) ||
    TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;
  const globalFilter = searchParams.get("query") ?? undefined;

  // Get column filters from URL
  const columnFilters = filterableColumnIds
    ? filterableColumnIds
        .map((id) => {
          const value = searchParams.get(id);
          return value ? { id, value: value.split(",") } : undefined;
        })
        .filter((f): f is { id: string; value: string[] } => f !== undefined)
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { pagination, columnFilters, globalFilter } = table.getState();
  const filterableColumns = table.options.meta?.filterableColumns;

  React.useEffect(() => {
    const url = new URL(window.location.href);

    // Update only the search parameters
    if (pagination.pageIndex === TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX) {
      url.searchParams.delete("page");
    } else {
      url.searchParams.set("page", String(pagination.pageIndex + 1));
    }

    if (pagination.pageSize === TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE) {
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
      const value = filter.value as string[];
      if (!value?.length) {
        url.searchParams.delete(filter.id);
      } else {
        url.searchParams.set(filter.id, value.join(","));
      }
    });

    // Sync global filter
    if (!globalFilter) {
      url.searchParams.delete("query");
    } else {
      url.searchParams.set("query", String(globalFilter));
    }

    // Replace only the search params portion of the URL
    router.push(url.href, { scroll: false });
  }, [
    pathname,
    router,
    searchParams,
    pagination,
    columnFilters,
    globalFilter,
    filterableColumns,
  ]);
}
