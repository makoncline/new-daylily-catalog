"use client";

import { api, type RouterOutputs } from "@/trpc/react";
import { type ColumnDef } from "@tanstack/react-table";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { ListingsTable } from "./listings-table";
import { ListingsToolbar } from "./listings-toolbar";
import { NoResults } from "./no-results";
import { H2 } from "@/components/typography";
import { baseListingColumns } from "@/app/dashboard/listings/_components/columns";
import { APP_CONFIG } from "@/config/constants";

type Listing = RouterOutputs["public"]["getListings"][number];
type Profile = RouterOutputs["public"]["getProfile"];
type ProfileLists = NonNullable<Profile>["lists"];

interface ListingsContentProps {
  userSlugOrId: string;
  lists: ProfileLists;
  initialListings: RouterOutputs["public"]["getListings"];
}

const columns = [...baseListingColumns] as ColumnDef<Listing>[];

export function ListingsContent({
  userSlugOrId,
  lists,
  initialListings,
}: ListingsContentProps) {
  const [data] = api.public.getListings.useSuspenseQuery(
    { userSlugOrId },
    {
      initialData: initialListings,
      staleTime: APP_CONFIG.CACHE.PUBLIC_ROUTER.TTL_S * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );

  const listings = data ?? initialListings;

  const table = useDataTable({
    data: listings ?? [],
    columns,
    storageKey: "catalog-listings-table",
  });

  const listsColumn = table.getColumn("lists");
  const listOptions = lists.map((list) => ({
    label: list.title,
    value: list.id,
    count: listings?.filter((listing) =>
      listing.lists.some(
        (listingList: { id: string }) => listingList.id === list.id,
      ),
    ).length,
  }));

  return (
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
  );
}
