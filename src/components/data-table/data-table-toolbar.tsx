"use client";

import * as React from "react";
import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  filterPlaceholder?: string;
  showTableOptions?: boolean;
  filterableColumns?: {
    id: string;
    title: string;
    options: { label: string; value: string; count?: number }[];
  }[];
}

export function DataTableToolbar<TData>({
  table,
  filterPlaceholder,
  showTableOptions = true,
  filterableColumns,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder={filterPlaceholder ?? "Filter..."}
          value={(table.getState().globalFilter as string) ?? ""}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {filterableColumns?.map(({ id, title, options }) => (
          <DataTableFacetedFilter
            key={id}
            column={table.getColumn(id)}
            title={title}
            options={options}
          />
        ))}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              table.resetGlobalFilter();
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      {showTableOptions && <DataTableViewOptions table={table} />}
    </div>
  );
}
