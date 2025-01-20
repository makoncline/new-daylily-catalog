"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { TABLE_CONFIG } from "@/config/constants";

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

export function useTableUrlSync(state: {
  pagination: { pageSize: number; pageIndex: number };
  columnFilters: { id: string; value: unknown }[];
  globalFilter: unknown;
  meta?: {
    filterableColumns?: string[];
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams);

    // Sync pagination
    if (
      state.pagination.pageIndex === TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX
    ) {
      params.delete("page");
    } else {
      params.set("page", String(state.pagination.pageIndex + 1));
    }

    if (
      state.pagination.pageSize === TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE
    ) {
      params.delete("size");
    } else {
      params.set("size", String(state.pagination.pageSize));
    }

    // First, remove all filterable column params that aren't in the current filters
    state.meta?.filterableColumns?.forEach((id) => {
      if (!state.columnFilters.some((filter) => filter.id === id)) {
        params.delete(id);
      }
    });

    // Then set the current column filters
    state.columnFilters.forEach((filter) => {
      const value = filter.value as string[];
      if (!value?.length) {
        params.delete(filter.id);
      } else {
        params.set(filter.id, value.join(","));
      }
    });

    // Sync global filter
    if (!state.globalFilter) {
      params.delete("query");
    } else {
      params.set("query", String(state.globalFilter));
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [
    state.pagination,
    state.columnFilters,
    state.globalFilter,
    state.meta?.filterableColumns,
    pathname,
    router,
    searchParams,
  ]);
}
