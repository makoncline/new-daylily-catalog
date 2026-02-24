"use client";

import * as React from "react";
import { X } from "lucide-react";
import {
  type ColumnDef,
  type RowSelectionState,
  type Table,
} from "@tanstack/react-table";
import { useLiveQuery } from "@tanstack/react-db";
import type { Image } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableFilteredCount } from "@/components/data-table/data-table-filtered-count";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { useDataTable } from "@/hooks/use-data-table";
import { APP_CONFIG } from "@/config/constants";
import { type RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { listingsCollection } from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { listsCollection } from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { imagesCollection } from "@/app/dashboard/_lib/dashboard-db/images-collection";
import { cultivarReferencesCollection } from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";
import {
  baseListingColumns,
  type ListingData,
} from "@/app/dashboard/listings/_components/columns";
import {
  TagDesignerPanel,
  type TagListingData,
} from "./tag-designer-panel";

type List = RouterOutputs["dashboardDb"]["list"]["list"][number];
type Listing = RouterOutputs["dashboardDb"]["listing"]["list"][number];
type CultivarReference =
  RouterOutputs["dashboardDb"]["cultivarReference"]["listForUserListings"][number];

const tagPrintColumns: ColumnDef<ListingData>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        className="h-4 w-4"
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        className="h-4 w-4"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  ...baseListingColumns,
];

function getSelectedIdsFromRowSelection(rowSelection: RowSelectionState) {
  return Object.entries(rowSelection)
    .filter(([, selected]) => selected)
    .map(([id]) => id);
}

interface TagPrintSelectableListing {
  id: string;
  userId?: string | null;
  title: string;
  price?: number | null;
  privateNote?: string | null;
  ahsListing: ListingData["ahsListing"];
  lists: ListingData["lists"];
}

export function buildSelectedTagListingsForPrint({
  listings,
  rowSelection,
}: {
  listings: TagPrintSelectableListing[];
  rowSelection: RowSelectionState;
}): TagListingData[] {
  const selectedIdSet = new Set(getSelectedIdsFromRowSelection(rowSelection));

  return listings
    .filter((listing) => selectedIdSet.has(listing.id))
    .map((listing) => ({
      id: listing.id,
      userId: listing.userId,
      title: listing.title,
      price: listing.price,
      privateNote: listing.privateNote,
      ahsListing: listing.ahsListing,
      listName: listing.lists.map((list) => list.title).join(", "),
    }));
}

interface SelectedListingsBadgesProps {
  table: Table<ListingData>;
  listingsById: Map<string, ListingData>;
}

function SelectedListingsBadges({ table, listingsById }: SelectedListingsBadgesProps) {
  const rowSelection = table.getState().rowSelection ?? {};
  const selectedIds = getSelectedIdsFromRowSelection(rowSelection);

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <span className="text-muted-foreground shrink-0 text-xs font-medium">
        Selected ({selectedIds.length}):
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() => table.setRowSelection({})}
      >
        Remove all
      </Button>
      {selectedIds.map((id) => {
        const listing = listingsById.get(id);
        const title = listing?.title ?? "(Unknown)";
        return (
          <Badge
            key={id}
            variant="secondary"
            className="group flex items-center gap-1 pr-1"
          >
            <span className="max-w-[12rem] truncate" title={title}>
              {title}
            </span>
            <button
              type="button"
              onClick={() => {
                table.setRowSelection((prev) => {
                  const next = { ...prev };
                  delete next[id];
                  return next;
                });
              }}
              className="hover:bg-muted rounded p-0.5 transition-colors"
              aria-label={`Deselect ${title}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
    </div>
  );
}

interface TagPrintToolbarProps {
  table: Table<ListingData>;
  lists: List[];
  listings: ListingData[];
}

function TagPrintToolbar({ table, lists, listings }: TagPrintToolbarProps) {
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
              placeholder="Filter listings to tag..."
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

export function TagPrintTable() {
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

    for (const image of effectiveImages) {
      if (!image.listingId) continue;
      const row = map.get(image.listingId) ?? [];
      row.push(image);
      map.set(image.listingId, row);
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

  const listingsById = React.useMemo(
    () => new Map(listings.map((l) => [l.id, l])),
    [listings],
  );

  const table = useDataTable({
    data: listings,
    columns: tagPrintColumns,
    storageKey: "tag-print-table",
    pinnedColumns: {
      left: ["select", "title"],
      right: [],
    },
    config: {
      enableRowSelection: true,
      getRowId: (row) => row.id,
    },
    initialStateOverrides: {
      pagination: {
        pageSize: APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_DEFAULT,
      },
    },
  });

  const rowSelection = table.getState().rowSelection ?? {};
  const selectedListings = buildSelectedTagListingsForPrint({
    listings,
    rowSelection,
  });

  if (!effectiveListings.length) {
    return (
      <EmptyState
        title="No listings"
        description="Create listings first, then come back to print tags."
      />
    );
  }

  return (
    <div className="space-y-4">
      <TagDesignerPanel listings={selectedListings} />

      <SelectedListingsBadges table={table} listingsById={listingsById} />

      <DataTableLayout
        table={table}
        toolbar={
          <TagPrintToolbar table={table} lists={effectiveLists} listings={listings} />
        }
        pagination={
          <DataTablePagination
            table={table}
            pageSizeOptions={APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_OPTIONS}
          />
        }
        noResults={
          <EmptyState
            title="No listings found"
            description="Try adjusting your search or list filters."
          />
        }
      >
        <DataTable table={table} />
      </DataTableLayout>
    </div>
  );
}
