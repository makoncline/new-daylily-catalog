"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableFilteredCount } from "@/components/data-table/data-table-filtered-count";
import { DataTableForSaleFilter } from "@/components/data-table/data-table-for-sale-filter";
import { Input } from "@/components/ui/input";
import { type PublicCatalogSearchToolbarProps } from "./public-catalog-search-types";

export function PublicCatalogSearchToolbar({
  table,
  listsColumn,
  listOptions,
  onSearchSubmit,
}: PublicCatalogSearchToolbarProps) {
  const globalFilter = table.getState().globalFilter as unknown;
  const [searchValue, setSearchValue] = useState<string>(
    typeof globalFilter === "string" ? globalFilter : "",
  );

  const debouncedFilter = useDebouncedCallback((value: string) => {
    table.setGlobalFilter(value);
    if (value) {
      table.setSorting([{ id: "title", desc: false }]);
    }
    table.resetPageIndex(true);
  }, 200);

  useEffect(() => {
    setSearchValue(typeof globalFilter === "string" ? globalFilter : "");
  }, [globalFilter]);

  if (!listsColumn) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    debouncedFilter.flush();
    onSearchSubmit?.();
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSubmit} data-testid="search-query-form">
          <Input
            placeholder="Search listings..."
            value={searchValue}
            className="h-8 w-[200px] sm:w-[260px]"
            data-testid="search-all-fields-input"
            onChange={(event) => {
              const next = event.target.value;
              setSearchValue(next);
              debouncedFilter(next);
            }}
          />
        </form>
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
