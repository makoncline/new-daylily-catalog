"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  sortableColumnIds,
}: {
  filterableColumnIds?: string[];
  sortableColumnIds?: string[];
} = {}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const pageIndex =
    (Number(searchParams.get("page")) ||
      TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX + 1) - 1;

  const pageSize =
    Number(searchParams.get("size")) || getDefaultPageSize(pathname);
  const globalFilter = searchParams.get("query") ?? undefined;
  const sorting = (() => {
    const value = searchParams.get("sort");
    if (!value) return undefined;

    const [id, direction] = value.split(".");
    if (!id || !sortableColumnIds?.includes(id)) return undefined;
    if (direction !== "asc" && direction !== "desc") return undefined;

    return [{ id, desc: direction === "desc" }];
  })();

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
    ...(sorting ? { sorting } : {}),
    meta: {
      filterableColumns: filterableColumnIds,
      sortableColumns: sortableColumnIds,
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
  const sortableColumns = table.options.meta?.sortableColumns;
  const useNativeUrlHistory = table.options.meta?.useNativeUrlHistory;
  const searchString = searchParams.toString();
  const synchronizedSearchRef = React.useRef(searchString);
  const pendingSearchesRef = React.useRef<string[]>([]);
  const skipNextWriteRef = React.useRef(false);

  React.useEffect(() => {
    if (searchString === synchronizedSearchRef.current) return;
    const pendingIndex = pendingSearchesRef.current.indexOf(searchString);
    if (pendingIndex >= 0) {
      pendingSearchesRef.current.splice(0, pendingIndex + 1);
      synchronizedSearchRef.current = searchString;
      return;
    }

    const nextPagination = {
      pageIndex:
        (Number(searchParams.get("page")) ||
          TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX + 1) - 1,
      pageSize:
        Number(searchParams.get("size")) || getDefaultPageSize(pathname),
    };
    const nextGlobalFilter = searchParams.get("query") ?? undefined;
    const nextColumnFilters = (filterableColumns ?? []).flatMap((id) => {
      const rawValue = searchParams.get(id);
      return rawValue
        ? [{ id, value: parseTableUrlColumnFilterValue(id, rawValue) }]
        : [];
    });
    const value = searchParams.get("sort");
    const [id, direction] = value?.split(".") ?? [];
    const nextSorting =
      id &&
      sortableColumns?.includes(id) &&
      (direction === "asc" || direction === "desc")
        ? [{ id, desc: direction === "desc" }]
        : nextGlobalFilter && sortableColumns?.includes("title")
          ? [{ id: "title", desc: false }]
          : [];
    const currentState = table.getState();
    synchronizedSearchRef.current = searchString;

    if (
      currentState.pagination.pageIndex !== nextPagination.pageIndex ||
      currentState.pagination.pageSize !== nextPagination.pageSize ||
      currentState.globalFilter !== nextGlobalFilter ||
      JSON.stringify(currentState.columnFilters) !==
        JSON.stringify(nextColumnFilters) ||
      currentState.sorting[0]?.id !== nextSorting[0]?.id ||
      currentState.sorting[0]?.desc !== nextSorting[0]?.desc
    ) {
      skipNextWriteRef.current = true;
      table.setState((state) => ({
        ...state,
        pagination: nextPagination,
        globalFilter: nextGlobalFilter,
        columnFilters: nextColumnFilters,
        sorting: nextSorting,
      }));
    }
  }, [
    filterableColumns,
    pathname,
    searchParams,
    searchString,
    sortableColumns,
    table,
  ]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }

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

    const firstSort = sorting[0];
    const hasImplicitQuerySort =
      Boolean(globalFilter) &&
      firstSort?.id === "title" &&
      firstSort.desc === false &&
      !oldParams.has("sort");
    if (firstSort && !hasImplicitQuerySort) {
      url.searchParams.set(
        "sort",
        `${firstSort.id}.${firstSort.desc ? "desc" : "asc"}`,
      );
    } else {
      url.searchParams.delete("sort");
    }

    const newParams = url.searchParams;
    const hasChanges =
      Array.from(oldParams.entries()).some(
        ([key, value]) => newParams.get(key) !== value,
      ) || Array.from(newParams.entries()).some(([key]) => !oldParams.has(key));

    // Only update URL if parameters have actually changed
    if (hasChanges) {
      const nextSearch = newParams.toString();
      if (pendingSearchesRef.current.at(-1) !== nextSearch) {
        pendingSearchesRef.current.push(nextSearch);
      }
      if (useNativeUrlHistory) {
        window.history.pushState(null, "", url.href);
      } else {
        router.push(url.href, { scroll: false });
      }
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
    useNativeUrlHistory,
  ]);
}
