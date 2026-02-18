"use client";

import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableFilteredCount } from "@/components/data-table/data-table-filtered-count";
import { DataTableForSaleFilter } from "@/components/data-table/data-table-for-sale-filter";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { type PublicCatalogSearchToolbarProps } from "./public-catalog-search-types";

export function PublicCatalogSearchToolbar({
  table,
  listsColumn,
  listOptions,
}: PublicCatalogSearchToolbarProps) {
  if (!listsColumn) {
    return null;
  }

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
