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
  const [tableData, setTableData] = useState<Listing[]>(initialListings ?? []);

  // Initialize table with initial listings
  const table = useDataTable({
    data: tableData,
    columns,
    storageKey: "public-catalog-listings-table",
    config: {
      state: {
        rowSelection: {},
      },
    },
  });

  // Fetch listings with infinite query
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    api.public.getListings.useInfiniteQuery(
      {
        userSlugOrId: params.userSlugOrId,
        limit: 100,
      },
      {
        getNextPageParam: (lastPage) => lastPage[lastPage.length - 1]?.id,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: HOUR_IN_MS,
        gcTime: HOUR_IN_MS,
        initialData: initialListings
          ? {
              pages: [initialListings],
              pageParams: [undefined],
            }
          : undefined,
        retry: false,
        refetchOnMount: false,
        refetchInterval: false,
      },
    );

  // Update table data when we get new pages
  useEffect(() => {
    if (data?.pages) {
      const allItems = data.pages.flat();
      setTableData(allItems);

      // If there's more data, fetch it immediately
      if (hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    }
  }, [data?.pages, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const listsColumn = table.getColumn("lists");

  // Memoize list options calculation
  const listOptions = useMemo(() => {
    const listCounts = new Map<string, number>();

    // Count listings per list in a single pass
    tableData?.forEach((listing: Listing) => {
      if (!listing?.lists) return;

      listing.lists.forEach((list: { id: string; title: string }) => {
        const count = listCounts.get(list.id) ?? 0;
        listCounts.set(list.id, count + 1);
      });
    });

    return (lists ?? []).map((list) => ({
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
          {(isLoading || isFetchingNextPage) && (
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
