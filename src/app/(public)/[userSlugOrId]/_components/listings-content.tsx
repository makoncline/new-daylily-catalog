"use client";

import { type RouterOutputs } from "@/trpc/react";
import { type ColumnDef } from "@tanstack/react-table";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { ListingsTable } from "./listings-table";
import { ListingsToolbar } from "./listings-toolbar";
import { NoResults } from "./no-results";
import { H2 } from "@/components/typography";
import { baseListingColumns } from "@/app/dashboard/listings/_components/columns";
import { ListsSection } from "./lists-section";

type Listing = RouterOutputs["public"]["getListings"][number];
type Profile = RouterOutputs["public"]["getProfile"];
type ProfileLists = NonNullable<Profile>["lists"];

interface ListingsContentProps {
  lists: ProfileLists;
  initialListings: RouterOutputs["public"]["getListings"];
}

const columns = [...baseListingColumns] as ColumnDef<Listing>[];

export function ListingsContent({
  lists,
  initialListings,
}: ListingsContentProps) {
  const table = useDataTable({
    data: initialListings ?? [],
    columns,
    storageKey: "public-catalog-listings-table",
  });

  const listsColumn = table.getColumn("lists");
  const listOptions = lists.map((list) => ({
    label: list.title,
    value: list.id,
    count: initialListings?.filter((listing) =>
      listing.lists.some(
        (listingList: { id: string }) => listingList.id === list.id,
      ),
    ).length,
  }));

  return (
    <div className="space-y-8">
      <ListsSection lists={lists} column={listsColumn} table={table} />

      <div id="listings" className="space-y-4">
        <H2 className="text-2xl">Listings</H2>
        <DataTableLayout
          table={table}
          toolbar={
            <ListingsToolbar
              table={table}
              listsColumn={listsColumn}
              listOptions={listOptions}
            />
          }
          pagination={<DataTablePagination table={table} />}
          noResults={
            <NoResults
              filtered={
                table.getState().globalFilter !== "" ||
                table.getState().columnFilters.length > 0
              }
            />
          }
        >
          <ListingsTable table={table} />
        </DataTableLayout>
      </div>
    </div>
  );
}
