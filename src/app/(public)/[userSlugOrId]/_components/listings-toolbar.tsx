"use client";

import { type RouterOutputs } from "@/trpc/react";
import { type Table, type Column } from "@tanstack/react-table";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableForSaleFilter } from "@/components/data-table/data-table-for-sale-filter";
import { DataTableFilteredCount } from "@/components/data-table/data-table-filtered-count";

type Listing = RouterOutputs["public"]["getListings"][number];

interface ListingsToolbarProps {
  table: Table<Listing>;
  listsColumn: Column<Listing, unknown> | undefined;
  listOptions: { label: string; value: string; count?: number }[];
}

export function ListingsToolbar({
  table,
  listsColumn,
  listOptions,
}: ListingsToolbarProps) {
  if (!listsColumn) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <DataTableGlobalFilter table={table} placeholder="Search listings..." />
        <DataTableFacetedFilter
          column={listsColumn}
          title="Lists"
          options={listOptions}
          table={table}
        />
        <DataTableForSaleFilter table={table} />
        <DataTableFilteredCount table={table} />
        <DataTableFilterReset table={table} />
      </div>
    </div>
  );
}
