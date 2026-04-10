"use client";

import { type Table } from "@tanstack/react-table";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableFilteredCount } from "@/components/data-table/data-table-filtered-count";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";

interface ListRef {
  id: string;
  title: string;
}

interface ListingWithLists {
  lists: ListRef[];
}

interface DashboardListingFilterToolbarProps<TData extends ListingWithLists> {
  lists: ListRef[];
  listings: TData[];
  placeholder: string;
  table: Table<TData>;
}

export function buildDashboardListingListFilterOptions<
  TData extends ListingWithLists,
>({
  lists,
  listings,
}: {
  lists: ListRef[];
  listings: TData[];
}) {
  return lists.map((list) => ({
    label: list.title,
    value: list.id,
    count: listings.filter((listing) =>
      listing.lists.some((listingList) => listingList.id === list.id),
    ).length,
  }));
}

export function DashboardListingFilterToolbar<TData extends ListingWithLists>({
  lists,
  listings,
  placeholder,
  table,
}: DashboardListingFilterToolbarProps<TData>) {
  const listsColumn = table.getColumn("lists");
  const listOptions = buildDashboardListingListFilterOptions({
    lists,
    listings,
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end sm:hidden">
        <DataTableViewOptions table={table} />
      </div>

      <div className="flex flex-1 flex-col items-start gap-2 sm:flex-row sm:items-center">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <DataTableGlobalFilter table={table} placeholder={placeholder} />
            <DataTableFacetedFilter
              column={listsColumn}
              title="Lists"
              options={listOptions}
              table={table}
            />
          </div>

          <div className="flex items-center gap-2">
            <DataTableFilteredCount table={table} />
            <DataTableFilterReset table={table} />
          </div>
        </div>

        <div className="hidden flex-1 sm:block" />
        <div className="hidden sm:block">
          <DataTableViewOptions table={table} />
        </div>
      </div>
    </div>
  );
}
