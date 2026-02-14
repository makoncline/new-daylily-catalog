"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { type RouterOutputs } from "@/trpc/react";
import { CreateListingButton } from "./create-listing-button";
import { useEditListing } from "./edit-listing-dialog";
import { useDataTable } from "@/hooks/use-data-table";
import { type Table } from "@tanstack/react-table";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableDownload } from "@/components/data-table";
import { APP_CONFIG } from "@/config/constants";
import { DataTableFilteredCount } from "@/components/data-table/data-table-filtered-count";
import { useLiveQuery } from "@tanstack/react-db";
import type { Image } from "@prisma/client";
import { listingsCollection } from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { listsCollection } from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { imagesCollection } from "@/app/dashboard/_lib/dashboard-db/images-collection";
import { cultivarReferencesCollection } from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";
import { getColumns, type ListingData } from "./columns";
import { getQueryClient } from "@/trpc/query-client";

type List = RouterOutputs["dashboardDb"]["list"]["list"][number];
type Listing = RouterOutputs["dashboardDb"]["listing"]["list"][number];
type CultivarReference =
  RouterOutputs["dashboardDb"]["cultivarReference"]["listForUserListings"][number];

interface ListingsTableToolbarProps {
  table: Table<ListingData>;
  lists: List[];
  listings: ListingData[];
}

function ListingsTableToolbar({
  table,
  lists,
  listings,
}: ListingsTableToolbarProps) {
  const listsColumn = table.getColumn("lists");
  const listOptions = lists.map((list) => ({
    label: list.title,
    value: list.id,
    count: listings.filter((listing) =>
      listing.lists.some((listingList) => listingList.id === list.id),
    ).length,
  }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end sm:hidden">
        <DataTableViewOptions table={table} />
      </div>

      <div className="flex flex-1 flex-col items-start gap-2 sm:flex-row sm:items-center">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <DataTableGlobalFilter
              table={table}
              placeholder="Filter listings..."
            />
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

function ListingsTableLive() {
  const { data: baseListings = [], isReady: isListingsReady } = useLiveQuery(
    (q) =>
      q
        .from({ listing: listingsCollection })
        .orderBy(({ listing }) => listing.createdAt, "desc"),
  );
  const { data: lists = [], isReady: isListsReady } = useLiveQuery((q) =>
    q
      .from({ list: listsCollection })
      .orderBy(({ list }) => list.createdAt, "desc"),
  );
  const { data: images = [], isReady: isImagesReady } = useLiveQuery((q) =>
    q
      .from({ img: imagesCollection })
      .orderBy(({ img }) => img.updatedAt, "asc"),
  );
  const { data: cultivarReferences = [], isReady: isCultivarReferencesReady } =
    useLiveQuery((q) =>
      q
        .from({ ref: cultivarReferencesCollection })
        .orderBy(({ ref }) => ref.updatedAt, "asc"),
    );
  const { editListing } = useEditListing();

  const queryClient = getQueryClient();
  const seededListings =
    queryClient.getQueryData<Listing[]>(["dashboard-db", "listings"]) ?? [];
  const seededLists =
    queryClient.getQueryData<List[]>(["dashboard-db", "lists"]) ?? [];
  const seededImages =
    queryClient.getQueryData<Image[]>(["dashboard-db", "images"]) ?? [];
  const seededCultivarReferences =
    queryClient.getQueryData<CultivarReference[]>([
      "dashboard-db",
      "cultivar-references",
    ]) ?? [];

  // `useLiveQuery` can report `isReady=false` briefly on mount even if the collections
  // are already preloaded. Fall back to the seeded react-query cache to prevent skeleton flashes.
  const effectiveListings = isListingsReady ? baseListings : seededListings;
  const effectiveLists = isListsReady ? lists : seededLists;
  const effectiveImages = isImagesReady ? images : seededImages;
  const effectiveCultivarReferences = isCultivarReferencesReady
    ? cultivarReferences
    : seededCultivarReferences;

  const listsByListingId = React.useMemo(() => {
    const map = new Map<string, Array<Pick<List, "id" | "title">>>();

    for (const list of effectiveLists) {
      for (const { id: listingId } of list.listings) {
        const row = map.get(listingId) ?? [];
        row.push({ id: list.id, title: list.title });
        map.set(listingId, row);
      }
    }

    return map;
  }, [effectiveLists]);

  const imagesByListingId = React.useMemo(() => {
    const map = new Map<string, Image[]>();

    for (const img of effectiveImages) {
      if (!img.listingId) continue;
      const row = map.get(img.listingId) ?? [];
      row.push(img);
      map.set(img.listingId, row);
    }

    for (const row of map.values()) {
      row.sort((a, b) => a.order - b.order);
    }

    return map;
  }, [effectiveImages]);

  const cultivarReferenceById = React.useMemo(() => {
    const map = new Map<string, CultivarReference>();
    effectiveCultivarReferences.forEach((row) => map.set(row.id, row));
    return map;
  }, [effectiveCultivarReferences]);

  const listings = React.useMemo<ListingData[]>(() => {
    return effectiveListings.map((listing) => {
      const ref = listing.cultivarReferenceId
        ? cultivarReferenceById.get(listing.cultivarReferenceId)
        : null;

      return {
        ...listing,
        images: imagesByListingId.get(listing.id) ?? [],
        lists: listsByListingId.get(listing.id) ?? [],
        ahsListing: ref?.ahsListing ?? null,
      };
    });
  }, [
    cultivarReferenceById,
    effectiveListings,
    imagesByListingId,
    listsByListingId,
  ]);

  const columns = getColumns(editListing);

  const table = useDataTable({
    data: listings,
    columns,
    storageKey: "listings-table",
    pinnedColumns: {
      left: ["select", "title"],
      right: ["actions"],
    },
    config: {
      enableRowSelection: true,
    },
    initialStateOverrides: {
      pagination: {
        pageSize: APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_DEFAULT,
      },
    },
  });

  if (!effectiveListings.length) {
    return (
      <EmptyState
        title="No listings"
        description="Create your first listing to start selling"
        action={<CreateListingButton />}
      />
    );
  }

  return (
    <div data-testid="listing-table">
      <DataTableLayout
        table={table}
        toolbar={
          <ListingsTableToolbar
            table={table}
            lists={effectiveLists}
            listings={listings}
          />
        }
        pagination={
          <>
            <DataTablePagination
              table={table}
              pageSizeOptions={
                APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_OPTIONS
              }
            />
            <DataTableDownload table={table} filenamePrefix="listings" />
          </>
        }
        noResults={
          <EmptyState
            title="No listings found"
            description="Try adjusting your filters or create a new listing"
            action={<CreateListingButton />}
          />
        }
      >
        <DataTable table={table} />
      </DataTableLayout>
    </div>
  );
}

export function ListingsTable() {
  return <ListingsTableLive />;
}
