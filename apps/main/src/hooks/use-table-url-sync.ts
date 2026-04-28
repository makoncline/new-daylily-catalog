"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { TABLE_CONFIG } from "@/config/constants";
import { type Table } from "@tanstack/react-table";
import {
  parseTableUrlColumnFilterValue,
  toTableUrlColumnFilterParamValue,
} from "@/lib/table-url-filters";

function getDefaultPageSize(pathname: string | null): number {
  if (!pathname) {
    return TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;
  }

  if (pathname.includes("/dashboard/lists")) {
    return TABLE_CONFIG.PAGINATION.LISTS_PAGE_SIZE_DEFAULT;
  }

  if (pathname.includes("/dashboard")) {
    return TABLE_CONFIG.PAGINATION.DASHBOARD_PAGE_SIZE_DEFAULT;
  }

  return TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;
}

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
    Number(searchParams.get("size")) || getDefaultPageSize(pathname);
  const globalFilter = searchParams.get("query") ?? undefined;

  // Get column filters from URL
  const columnFilters = filterableColumnIds
    ? filterableColumnIds.flatMap((id) => {
        const rawValue = searchParams.get(id);
        if (!rawValue) {
          return [];
        }

        return [
          {
            id,
            value: parseTableUrlColumnFilterValue(id, rawValue),
          },
        ];
      })
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
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const oldParams = new URLSearchParams(window.location.search);
    const defaultPageSize = getDefaultPageSize(pathname);

    // Update only the search parameters
    if (pagination.pageIndex === TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX) {
      url.searchParams.delete("page");
    } else {
      url.searchParams.set("page", String(pagination.pageIndex + 1));
    }

    if (pagination.pageSize === defaultPageSize) {
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
      const isEmptyValue =
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.length === 0) ||
        (Array.isArray(value) && value.length === 0);

      if (isEmptyValue) {
        url.searchParams.delete(filter.id);
      } else {
        url.searchParams.set(
          filter.id,
          toTableUrlColumnFilterParamValue(value),
        );
      }
    });

    // Sync global filter
    if (!globalFilter) {
      url.searchParams.delete("query");
    } else {
      url.searchParams.set("query", String(globalFilter));
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
    filterableColumns,
  ]);
}
