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

  // 1. Get global filter first
  const globalFilter = searchParams.get("query") ?? undefined;

  // 2. Get column filters
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

  // 3. Get pagination params
  const pageIndex =
    (Number(searchParams.get("page")) ||
      TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX + 1) - 1;
  const pageSize =
    Number(searchParams.get("size")) ||
    TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;

  // Return state in the same order as we sync it
  return {
    globalFilter,
    columnFilters,
    pagination: {
      pageIndex,
      pageSize,
    },
    meta: {
      filterableColumns: filterableColumnIds,
    },
  };
}

export function useTableUrlSync<TData>(table: Table<TData>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current table state
  const { pagination, columnFilters, globalFilter } = table.getState();
  const filterableColumns = table.options.meta?.filterableColumns;

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const oldParams = new URLSearchParams(window.location.search);
    const newParams = new URLSearchParams();

    // Build up new params in specific order to ensure consistency

    // 1. Add global filter first if it exists
    if (globalFilter) {
      newParams.set("query", String(globalFilter));
    } else if (oldParams.has("query")) {
      // Preserve existing query if it exists
      newParams.set("query", oldParams.get("query")!);
    }

    // 2. Add column filters
    columnFilters.forEach((filter) => {
      const value = filter.value;
      if (value) {
        if (Array.isArray(value)) {
          newParams.set(filter.id, value.join(","));
        } else {
          newParams.set(filter.id, String(value));
        }
      }
    });

    // 3. Add pagination params
    if (pagination.pageIndex !== TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX) {
      newParams.set("page", String(pagination.pageIndex + 1));
    }
    if (pagination.pageSize !== TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE) {
      newParams.set("size", String(pagination.pageSize));
    }

    // Check if params have changed
    const hasChanges =
      Array.from(oldParams.entries()).some(
        ([key, value]) => newParams.get(key) !== value,
      ) || Array.from(newParams.entries()).some(([key]) => !oldParams.has(key));

    // Only update URL if parameters have actually changed
    if (hasChanges) {
      url.search = newParams.toString();
      window.history.pushState(null, "", url.href);
    }
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
