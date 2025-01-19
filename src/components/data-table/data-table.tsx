"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnOrderState,
  FilterFn,
  SortingFn,
} from "@tanstack/react-table";
import { useRouter, usePathname } from "next/navigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { fuzzyFilter, fuzzySort } from "@/lib/table-utils";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { TABLE_CONFIG } from "@/config/constants";

declare module "@tanstack/table-core" {
  interface FilterFns {
    fuzzy: FilterFn<unknown>;
  }
  interface SortingFns {
    fuzzySort: SortingFn<unknown>;
  }
}

interface DataTablePinnedConfig {
  left?: number;
  right?: number;
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  options?: {
    pinnedColumns: DataTablePinnedConfig;
  };
  filterPlaceholder?: string;
  showTableOptions?: boolean;
  filterableColumns?: {
    id: string;
    title: string;
    options: { label: string; value: string; count?: number }[];
  }[];
}

function useTableUrlSync({
  pagination,
  columnFilters,
  globalFilter,
  filterableColumns,
}: {
  pagination: { pageSize: number; pageIndex: number };
  columnFilters: { id: string; value: unknown }[];
  globalFilter: string | undefined;
  filterableColumns?: { id: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams);

    // Sync pagination
    if (pagination.pageIndex === TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX) {
      params.delete("page");
    } else {
      params.set("page", String(pagination.pageIndex + 1));
    }

    if (pagination.pageSize === TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE) {
      params.delete("size");
    } else {
      params.set("size", String(pagination.pageSize));
    }

    // First, remove all filterable column params that aren't in the current filters
    filterableColumns?.forEach((column) => {
      if (!columnFilters.some((filter) => filter.id === column.id)) {
        params.delete(column.id);
      }
    });

    // Then set the current column filters
    columnFilters.forEach((filter) => {
      const value = filter.value as string[];
      if (!value?.length) {
        params.delete(filter.id);
      } else {
        params.set(filter.id, value.join(","));
      }
    });

    // Sync global filter
    if (!globalFilter) {
      params.delete("query");
    } else {
      params.set("query", globalFilter);
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [
    pagination,
    columnFilters,
    globalFilter,
    filterableColumns,
    pathname,
    router,
    searchParams,
  ]);
}

export function DataTable<TData extends { id: string }>({
  columns,
  data,
  options = { pinnedColumns: { left: 0, right: 0 } },
  filterPlaceholder,
  showTableOptions = true,
  filterableColumns,
}: DataTableProps<TData>) {
  const searchParams = useSearchParams();
  const { left: leftPinnedCount = 0, right: rightPinnedCount = 0 } =
    options.pinnedColumns;

  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    useLocalStorage<VisibilityState>("listings-table-column-visibility", {});
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "listings-table-sorting",
    [],
  );
  const [columnOrder, setColumnOrder] = useLocalStorage<ColumnOrderState>(
    "listings-table-column-order",
    [],
  );

  const table = useReactTable<TData>({
    data,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    sortingFns: {
      fuzzySort,
    },
    initialState: {
      pagination: {
        pageIndex:
          (Number(searchParams.get("page")) ||
            TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX + 1) - 1,
        pageSize:
          Number(searchParams.get("size")) ||
          TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
      },
      columnFilters:
        filterableColumns?.map((column) => {
          const filterValue = searchParams.get(column.id);
          return {
            id: column.id,
            value: filterValue ? filterValue.split(",") : undefined,
          };
        }) ?? [],
      globalFilter: searchParams.get("query") ?? undefined,
    },
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnOrder,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    globalFilterFn: "fuzzy",
    getFilteredRowModel: getFilteredRowModel(),
    autoResetPageIndex: false,
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // Use unified URL sync hook
  const { pagination, columnFilters, globalFilter } = table.getState();
  useTableUrlSync({
    pagination,
    columnFilters,
    globalFilter: globalFilter as string,
    filterableColumns,
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        filterPlaceholder={filterPlaceholder}
        showTableOptions={showTableOptions}
        filterableColumns={filterableColumns}
      />
      <div className="grid auto-rows-min rounded-md border">
        <div className="flex min-w-full">
          {/* Left pinned table */}
          {leftPinnedCount > 0 && (
            <div className="shrink-0 border-r bg-background">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers
                        .slice(0, leftPinnedCount)
                        .map((header) => (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            className="h-12 whitespace-nowrap"
                          >
                            {header.isPlaceholder ? null : (
                              <div
                                {...{
                                  className: header.column.getCanSort()
                                    ? "flex cursor-pointer select-none items-center gap-2"
                                    : "flex items-center gap-2",
                                  onClick: header.column.getCanSort()
                                    ? header.column.getToggleSortingHandler()
                                    : undefined,
                                }}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                              </div>
                            )}
                          </TableHead>
                        ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row
                          .getVisibleCells()
                          .slice(0, leftPinnedCount)
                          .map((cell) => (
                            <TableCell key={cell.id} className="h-12">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={leftPinnedCount}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Center scrollable table */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers
                      .slice(
                        leftPinnedCount,
                        headerGroup.headers.length - rightPinnedCount,
                      )
                      .map((header) => (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          className="h-12 whitespace-nowrap"
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              {...{
                                className: header.column.getCanSort()
                                  ? "flex cursor-pointer select-none items-center gap-2"
                                  : "flex items-center gap-2",
                                onClick: header.column.getCanSort()
                                  ? header.column.getToggleSortingHandler()
                                  : undefined,
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </div>
                          )}
                        </TableHead>
                      ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row
                        .getVisibleCells()
                        .slice(
                          leftPinnedCount,
                          row.getVisibleCells().length - rightPinnedCount,
                        )
                        .map((cell) => (
                          <TableCell key={cell.id} className="h-12">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={
                        columns.length - leftPinnedCount - rightPinnedCount
                      }
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Right pinned table */}
          {rightPinnedCount > 0 && (
            <div className="shrink-0 border-l bg-background">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers
                        .slice(-rightPinnedCount)
                        .map((header) => (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            className="h-12 whitespace-nowrap"
                          >
                            {header.isPlaceholder ? null : (
                              <div
                                {...{
                                  className: header.column.getCanSort()
                                    ? "flex cursor-pointer select-none items-center gap-2"
                                    : "flex items-center gap-2",
                                  onClick: header.column.getCanSort()
                                    ? header.column.getToggleSortingHandler()
                                    : undefined,
                                }}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                              </div>
                            )}
                          </TableHead>
                        ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row
                          .getVisibleCells()
                          .slice(-rightPinnedCount)
                          .map((cell) => (
                            <TableCell key={cell.id} className="h-12">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={rightPinnedCount}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
      <DataTablePagination table={table} totalCount={data.length} />
    </div>
  );
}
