"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  filterPlaceholder?: string;
  showTableOptions?: boolean;
}

export function DataTableToolbar<TData>({
  table,
  filterPlaceholder = "Filter listings...",
  showTableOptions = true,
}: DataTableToolbarProps<TData>) {
  const globalFilter = table.getState().globalFilter as string | undefined;
  const isFiltered =
    typeof globalFilter === "string" && globalFilter.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder={filterPlaceholder}
          value={globalFilter ?? ""}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.setGlobalFilter("")}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      {showTableOptions && <DataTableViewOptions table={table} />}
    </div>
  );
}
