"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { type Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  filterPlaceholder?: string;
  showTableOptions?: boolean;
  lists?: {
    id: string;
    name: string;
    count?: number;
  }[];
}

export function DataTableToolbar<TData>({
  table,
  filterPlaceholder = "Filter listings...",
  showTableOptions = true,
  lists = [],
}: DataTableToolbarProps<TData>) {
  const globalFilter = table.getState().globalFilter as string | undefined;
  const listFilter = table
    .getState()
    .columnFilters.find((f) => f.id === "lists")?.value as string[] | undefined;
  const isFiltered =
    (typeof globalFilter === "string" && globalFilter.length > 0) ||
    (Array.isArray(listFilter) && listFilter.length > 0);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder={filterPlaceholder}
          value={globalFilter ?? ""}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {lists.length > 0 && (
          <DataTableFacetedFilter
            column={table.getColumn("lists")}
            title="Lists"
            options={lists.map((list) => ({
              label: list.name,
              value: list.id,
              count: list.count,
            }))}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.getColumn("lists")?.setFilterValue(undefined);
              table.setGlobalFilter("");
            }}
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
