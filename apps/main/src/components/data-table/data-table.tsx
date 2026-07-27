"use client";

import * as React from "react";
import {
  flexRender,
  type FilterFn,
  type SortingFn,
  type Table,
} from "@tanstack/react-table";

import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

declare module "@tanstack/react-table" {
  interface FilterFns {
    fuzzy: FilterFn<unknown>;
  }
  interface SortingFns {
    fuzzySort: SortingFn<unknown>;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData> {
    filterableColumns?: string[];
    storageKey?: string;
    pinnedColumns?: {
      left?: string[];
      right?: string[];
    };
    getColumnLabel?: (columnId: string) => string;
  }
}

interface DataTableProps<TData> {
  density?: "compact" | "default";
  table: Table<TData>;
}

export function DataTable<TData>({
  density = "default",
  table,
}: DataTableProps<TData>) {
  const leftPinnedColumns = table.options.meta?.pinnedColumns?.left ?? [];
  const rightPinnedColumns = table.options.meta?.pinnedColumns?.right ?? [];
  const leftPinnedColumnIds = new Set(leftPinnedColumns);
  const rightPinnedColumnIds = new Set(rightPinnedColumns);
  const hasScrollableColumns = table
    .getVisibleLeafColumns()
    .some(
      (column) =>
        !leftPinnedColumnIds.has(column.id) &&
        !rightPinnedColumnIds.has(column.id),
    );
  const headerClassName =
    density === "compact" ? "h-9 whitespace-nowrap" : "h-12 whitespace-nowrap";
  const rowClassName = density === "compact" ? "h-12" : "h-20";
  const cellClassName =
    density === "compact"
      ? "h-12 max-w-96 min-w-24 overflow-hidden whitespace-nowrap"
      : "h-20 max-w-96 min-w-24 overflow-hidden whitespace-nowrap";
  const pinnedCellClassName =
    density === "compact"
      ? "h-12 max-w-52 min-w-24 overflow-hidden whitespace-nowrap"
      : "h-20 max-w-52 min-w-24 overflow-hidden whitespace-nowrap";
  const rightPinnedCellClassName =
    density === "compact"
      ? "h-12 max-w-96 overflow-hidden whitespace-nowrap"
      : "h-20 max-w-96 overflow-hidden whitespace-nowrap";
  const cellContentClassName =
    density === "compact"
      ? "flex h-10 min-w-0 items-center overflow-hidden"
      : "flex h-16 min-w-0 items-center overflow-hidden";

  return (
    <div
      className="grid max-w-full min-w-0 auto-rows-min overflow-hidden rounded-md border"
      data-density={density}
    >
      <div className="flex min-w-full">
        {/* Left pinned table */}
        {leftPinnedColumns.length > 0 && table.getHeaderGroups() && (
          <div
            className={
              hasScrollableColumns
                ? "bg-background shrink-0 border-r"
                : "bg-background min-w-0 flex-1 border-r"
            }
            data-slot="data-table-pinned-left"
          >
            <UITable>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) =>
                      leftPinnedColumnIds.has(header.column.id) ? (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          className={headerClassName}
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
                      ) : null,
                    )}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={rowClassName}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) =>
                      leftPinnedColumnIds.has(cell.column.id) ? (
                        <TableCell
                          key={cell.id}
                          className={pinnedCellClassName}
                        >
                          <div className={cellContentClassName}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </div>
                        </TableCell>
                      ) : null,
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </UITable>
          </div>
        )}

        {/* Center scrollable table */}
        {hasScrollableColumns ? (
          <div
            className="min-w-0 flex-1 overflow-hidden"
            data-slot="data-table-scrollable"
          >
            <UITable>
              {table.getHeaderGroups() && (
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) =>
                        !leftPinnedColumnIds.has(header.column.id) &&
                        !rightPinnedColumnIds.has(header.column.id) ? (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            className={headerClassName}
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
                        ) : null,
                      )}
                    </TableRow>
                  ))}
                </TableHeader>
              )}
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={rowClassName}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) =>
                      !leftPinnedColumnIds.has(cell.column.id) &&
                      !rightPinnedColumnIds.has(cell.column.id) ? (
                        <TableCell key={cell.id} className={cellClassName}>
                          <div className={cellContentClassName}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </div>
                        </TableCell>
                      ) : null,
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </UITable>
          </div>
        ) : null}

        {/* Right pinned table */}
        {rightPinnedColumns.length > 0 && table.getHeaderGroups() && (
          <div
            className="bg-background shrink-0 border-l"
            data-slot="data-table-pinned-right"
          >
            <UITable>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) =>
                      rightPinnedColumnIds.has(header.column.id) ? (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          className={headerClassName}
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
                      ) : null,
                    )}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={rowClassName}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) =>
                      rightPinnedColumnIds.has(cell.column.id) ? (
                        <TableCell
                          key={cell.id}
                          className={rightPinnedCellClassName}
                        >
                          <div className={cellContentClassName}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </div>
                        </TableCell>
                      ) : null,
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </UITable>
          </div>
        )}
      </div>
    </div>
  );
}
