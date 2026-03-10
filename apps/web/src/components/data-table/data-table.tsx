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
  table: Table<TData>;
}

export function DataTable<TData>({ table }: DataTableProps<TData>) {
  const leftPinnedColumns = table.options.meta?.pinnedColumns?.left ?? [];
  const rightPinnedColumns = table.options.meta?.pinnedColumns?.right ?? [];

  return (
    <div className="grid auto-rows-min rounded-md border">
      <div className="flex min-w-full">
        {/* Left pinned table */}
        {leftPinnedColumns.length > 0 && table.getHeaderGroups() && (
          <div className="shrink-0 border-r bg-background">
            <UITable>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers
                      .filter((header) =>
                        leftPinnedColumns.includes(header.column.id),
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
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row
                      .getVisibleCells()
                      .filter((cell) =>
                        leftPinnedColumns.includes(cell.column.id),
                      )
                      .map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="h-20 min-w-24 max-w-52 overflow-hidden whitespace-nowrap"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </UITable>
          </div>
        )}

        {/* Center scrollable table */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <UITable>
            {table.getHeaderGroups() && (
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers
                      .filter(
                        (header) =>
                          !leftPinnedColumns.includes(header.column.id) &&
                          !rightPinnedColumns.includes(header.column.id),
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
            )}
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row
                    .getVisibleCells()
                    .filter(
                      (cell) =>
                        !leftPinnedColumns.includes(cell.column.id) &&
                        !rightPinnedColumns.includes(cell.column.id),
                    )
                    .map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="h-20 min-w-24 max-w-96 overflow-hidden whitespace-nowrap"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                </TableRow>
              ))}
            </TableBody>
          </UITable>
        </div>

        {/* Right pinned table */}
        {rightPinnedColumns.length > 0 && table.getHeaderGroups() && (
          <div className="shrink-0 border-l bg-background">
            <UITable>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers
                      .filter((header) =>
                        rightPinnedColumns.includes(header.column.id),
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
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row
                      .getVisibleCells()
                      .filter((cell) =>
                        rightPinnedColumns.includes(cell.column.id),
                      )
                      .map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="h-20 max-w-96 overflow-hidden whitespace-nowrap"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
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
