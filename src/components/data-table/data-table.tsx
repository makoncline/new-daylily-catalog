"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type ColumnDef,
  type ColumnFiltersState,
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
} from "@tanstack/react-table";

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
import { fuzzyFilter } from "@/lib/table-utils";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { TABLE_CONFIG } from "@/config/constants";

interface DataTablePinnedConfig {
  left?: number;
  right?: number;
}

interface DataTablePaginationConfig {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  options?: {
    pinnedColumns: DataTablePinnedConfig;
    pagination?: DataTablePaginationConfig;
  };
  filterPlaceholder?: string;
  showTableOptions?: boolean;
  onPaginationChange?: (pageIndex: number, pageSize: number) => void;
  filterableColumns?: {
    id: string;
    title: string;
    options: { label: string; value: string; count?: number }[];
  }[];
}

export function DataTable<TData extends { id: string }>({
  columns,
  data,
  options = { pinnedColumns: { left: 0, right: 0 } },
  filterPlaceholder,
  showTableOptions = true,
  onPaginationChange,
  filterableColumns,
}: DataTableProps<TData>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read pagination state from URL (convert from 1-based to 0-based)
  const pageSize =
    Number(searchParams.get("size")) ||
    TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;
  const pageIndex = (Number(searchParams.get("page")) || 1) - 1;

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
  const [globalFilter, setGlobalFilter] = React.useState<string>(
    searchParams.get("filter") ?? "",
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const handleFilterChange = React.useCallback((value: string) => {
    setGlobalFilter(value);
  }, []);

  const handleColumnFiltersChange = React.useCallback(
    (
      updaterOrValue:
        | ColumnFiltersState
        | ((old: ColumnFiltersState) => ColumnFiltersState),
    ) => {
      const newFilters =
        typeof updaterOrValue === "function"
          ? updaterOrValue(columnFilters)
          : updaterOrValue;
      setColumnFilters(newFilters);
    },
    [],
  );

  const table = useReactTable<TData>({
    data,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      columnOrder,
      globalFilter,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onGlobalFilterChange: handleFilterChange,
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newState = updater({ pageIndex, pageSize });
        const params = new URLSearchParams(searchParams);

        if (newState.pageSize === TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE) {
          params.delete("size");
        } else {
          params.set("size", newState.pageSize.toString());
        }

        if (newState.pageIndex === TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX) {
          params.delete("page");
        } else {
          // Convert to 1-based for URL
          params.set("page", (newState.pageIndex + 1).toString());
        }

        router.push(`?${params.toString()}`, { scroll: false });
        onPaginationChange?.(newState.pageIndex, newState.pageSize);
      }
    },
    manualPagination: !!options.pagination,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
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
      <DataTablePagination
        table={table}
        totalCount={options.pagination?.totalCount ?? 0}
      />
    </div>
  );
}
