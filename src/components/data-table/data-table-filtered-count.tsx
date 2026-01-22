"use client";

import * as React from "react";
import { type Table } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { InlineCode } from "@/components/typography";

interface DataTableFilteredCountProps<TData> {
  table: Table<TData>;
}

export function DataTableFilteredCount<TData>({
  table,
}: DataTableFilteredCountProps<TData>) {
  // Calculate the number of rows that match the current filters
  // Show total FILTERED rows (not per-page) to preserve original semantics
  const filteredRowsCount = table.getFilteredRowModel().rows.length;
  // Get the total number of rows
  const totalRowsCount = table.getCoreRowModel().rows.length;

  // Format numbers with thousand separators
  const formattedFilteredCount = filteredRowsCount.toLocaleString();
  const formattedTotalCount = totalRowsCount.toLocaleString();

  // Check if any filters are applied
  const hasFilters =
    table.getState().columnFilters.length > 0 ||
    (table.getState().globalFilter !== undefined &&
      table.getState().globalFilter !== "");

  // Always show counts (filtered / total) for better UX

  return (
    <InlineCode
      className={hasFilters ? "text-xs" : "text-muted-foreground text-xs"}
    >
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Eye
          className={
            hasFilters ? "h-3.5 w-3.5" : "text-muted-foreground h-3.5 w-3.5"
          }
        />
        <span data-testid="filtered-rows-count">
          {formattedFilteredCount} / {formattedTotalCount}
        </span>
      </div>
    </InlineCode>
  );
}
