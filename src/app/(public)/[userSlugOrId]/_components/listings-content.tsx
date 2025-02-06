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
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";

type Listing = RouterOutputs["public"]["getListings"][number];
type Profile = RouterOutputs["public"]["getProfile"];
type ProfileLists = NonNullable<Profile>["lists"];

interface ListingsContentProps {
  lists: ProfileLists;
  initialListings: Listing[];
}

const columns = [...baseListingColumns] as ColumnDef<Listing>[];

// Cache times in milliseconds
const HOUR_IN_MS = 1000 * 60 * 60;

export function ListingsContent({
  lists,
  initialListings,
}: ListingsContentProps) {
  const params = useParams<{ userSlugOrId: string }>();
  const [tableData, setTableData] = useState(initialListings);

  // Initialize table with initial listings
  const table = useDataTable({
    data: tableData,
    columns,
    storageKey: "public-catalog-listings-table",
  });

  // Fetch all listings in the background with caching
  const { data: allListingsData, isLoading } = api.public.getListings.useQuery(
    { userSlugOrId: params.userSlugOrId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: HOUR_IN_MS,
      gcTime: HOUR_IN_MS,
    },
  );

  // Update table data when we get all listings
  useEffect(() => {
    if (allListingsData && allListingsData.length >= tableData.length) {
      setTableData(allListingsData);
    }
  }, [allListingsData, tableData.length]);

  const listsColumn = table.getColumn("lists");

  // Memoize list options calculation
  const listOptions = useMemo(() => {
    const listCounts = new Map<string, number>();

    // Count listings per list in a single pass
    tableData.forEach((listing) => {
      listing.lists.forEach((listingList) => {
        const count = listCounts.get(listingList.id) ?? 0;
        listCounts.set(listingList.id, count + 1);
      });
    });

    return lists.map((list) => ({
      label: list.title,
      value: list.id,
      count: listCounts.get(list.id) ?? 0,
    }));
  }, [lists, tableData]);

  return (
    <div className="space-y-8">
      <ListsSection lists={lists} column={listsColumn} table={table} />

      <div id="listings" className="space-y-4">
        <div className="flex items-center justify-between">
          <H2 className="text-2xl">Listings</H2>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more listings...</span>
            </div>
          )}
        </div>

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
