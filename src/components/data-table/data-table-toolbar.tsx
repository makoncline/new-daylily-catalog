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
    options: {
      label: string;
      value: string;
      count?: number;
    }[];
  }[];
  selectedItemsActions?: React.ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  filterPlaceholder,
  showTableOptions = true,
  filterableColumns,
  selectedItemsActions,
}: DataTableToolbarProps<TData>) {
  const state = table.getState();
  const isFiltered =
    state.columnFilters.length > 0 || Boolean(state.globalFilter);
  const hasSelectedRows = table.getFilteredSelectedRowModel().rows.length > 0;

  return (
    <div className="space-y-4">
      {hasSelectedRows && selectedItemsActions && (
        <div className="flex items-center gap-2">{selectedItemsActions}</div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder={filterPlaceholder ?? "Filter..."}
            value={(state.globalFilter as string) ?? ""}
            onChange={(event) => {
              table.setGlobalFilter(event.target.value);
              table.resetPageIndex(true);
            }}
            className="h-8 w-[150px] lg:w-[250px]"
          />

          {filterableColumns?.map(({ id, title, options }) => (
            <DataTableFacetedFilter<TData>
              key={id}
              column={table.getColumn(id)}
              title={title}
              options={options}
              table={table}
            />
          ))}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => {
                table.resetColumnFilters(true);
                table.resetGlobalFilter(true);
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
    </div>
  );
}
