"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { getColumns } from "./columns";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { type Table } from "@tanstack/react-table";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { type ListingData } from "./columns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableDownload } from "@/components/data-table";
import { slugify } from "@/lib/utils/slugify";
import { DataTableFilteredCount } from "@/components/data-table/data-table-filtered-count";
import { useLiveQuery } from "@tanstack/react-db";
import {
  listsCollection,
  removeListingFromList,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { listingsCollection } from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { imagesCollection } from "@/app/dashboard/_lib/dashboard-db/images-collection";
import { cultivarReferencesCollection } from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";
import { getQueryClient } from "@/trpc/query-client";
import { type RouterOutputs } from "@/trpc/react";
import type { Image } from "@prisma/client";

interface ListListingsTableProps {
  listId: string;
  onMutationSuccess?: () => void;
}

type List = RouterOutputs["dashboardDb"]["list"]["list"][number];
type Listing = RouterOutputs["dashboardDb"]["listing"]["list"][number];
type CultivarReference =
  RouterOutputs["dashboardDb"]["cultivarReference"]["listForUserListings"][number];

const tableOptions = {
  pinnedColumns: {
    left: ["select", "title"],
    right: [],
  },
  storageKey: "list-listings-table",
};

function SelectedItemsActions({
  table,
  listId,
  onMutationSuccess,
}: {
  table: Table<ListingData>;
  listId: string;
  onMutationSuccess?: () => void;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedListingIds = selectedRows.map((row) => row.original.id);

  const handleRemoveSelected = async () => {
    if (!selectedListingIds.length || isPending) return;

    setIsPending(true);
    try {
      for (const listingId of selectedListingIds) {
        await removeListingFromList({ listId, listingId });
      }

      onMutationSuccess?.();
      toast.success("Listings removed from list");
      table.resetRowSelection();
      setShowDeleteDialog(false);
    } catch {
      toast.error("Failed to remove listings from list");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowDeleteDialog(true)}
        disabled={isPending}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Remove {selectedRows.length} selected
      </Button>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => void handleRemoveSelected()}
        title="Remove Listings"
        description={`Are you sure you want to remove ${selectedRows.length} listing${selectedRows.length === 1 ? "" : "s"} from this list? This action cannot be undone.`}
      />
    </>
  );
}

interface ListingsTableToolbarProps {
  table: Table<ListingData>;
  listId: string;
  onMutationSuccess?: () => void;
}

function ListingsTableToolbar({
  table,
  listId,
  onMutationSuccess,
}: ListingsTableToolbarProps) {
  const hasSelectedRows = table.getFilteredSelectedRowModel().rows.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <DataTableGlobalFilter
            table={table}
            placeholder="Filter listings..."
          />
          <DataTableFilteredCount table={table} />
          <DataTableFilterReset table={table} />
          {hasSelectedRows && (
            <SelectedItemsActions
              table={table}
              listId={listId}
              onMutationSuccess={onMutationSuccess}
            />
          )}
          <div className="flex-1" />
          <DataTableViewOptions table={table} />
        </div>
      </div>
    </div>
  );
}

export function ListListingsTable({
  listId,
  onMutationSuccess,
}: ListListingsTableProps) {
  const { data: lists = [], isReady: isListsReady } = useLiveQuery(
    (q) =>
      q
        .from({ list: listsCollection })
        .orderBy(({ list }) => list.createdAt, "desc"),
  );
  const { data: baseListings = [], isReady: isListingsReady } = useLiveQuery(
    (q) =>
      q
        .from({ listing: listingsCollection })
        .orderBy(({ listing }) => listing.createdAt, "desc"),
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
  const seededLists =
    queryClient.getQueryData<List[]>(["dashboard-db", "lists"]) ?? [];
  const seededListings =
    queryClient.getQueryData<Listing[]>(["dashboard-db", "listings"]) ?? [];
  const seededImages =
    queryClient.getQueryData<Image[]>(["dashboard-db", "images"]) ?? [];
  const seededCultivarReferences =
    queryClient.getQueryData<CultivarReference[]>([
      "dashboard-db",
      "cultivar-references",
    ]) ?? [];

  const effectiveLists = isListsReady ? lists : seededLists;
  const effectiveListings = isListingsReady ? baseListings : seededListings;
  const effectiveImages = isImagesReady ? images : seededImages;
  const effectiveCultivarReferences = isCultivarReferencesReady
    ? cultivarReferences
    : seededCultivarReferences;

  const list = effectiveLists.find((row) => row.id === listId) ?? null;

  const listingIdsInList = React.useMemo(() => {
    if (!list?.listings?.length) return new Set<string>();
    return new Set(list.listings.map(({ id }) => id));
  }, [list]);

  const listsByListingId = React.useMemo(() => {
    const map = new Map<string, Array<Pick<List, "id" | "title">>>();

    for (const listRow of effectiveLists) {
      for (const { id: listingId } of listRow.listings) {
        const row = map.get(listingId) ?? [];
        row.push({ id: listRow.id, title: listRow.title });
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
    if (!listingIdsInList.size) return [];

    return effectiveListings
      .filter((listing) => listingIdsInList.has(listing.id))
      .map((listing) => {
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
    listingIdsInList,
    listsByListingId,
  ]);

  const columns = getColumns();

  const table = useDataTable({
    data: listings ?? [],
    columns,
    ...tableOptions,
  });

  if (!listings?.length) {
    return (
      <EmptyState
        title="No listings"
        description="This list has no listings yet. Add some listings to get started."
      />
    );
  }

  return (
    <div className="space-y-4" data-testid="manage-list-table">
      <div>
        <Label>Listings</Label>
        <p className="text-[0.8rem] text-muted-foreground">
          Select listings to remove them or use the table options to customize
          your view.
        </p>
      </div>

      <DataTableLayout
        table={table}
        toolbar={
          <ListingsTableToolbar
            table={table}
            listId={listId}
            onMutationSuccess={onMutationSuccess}
          />
        }
        pagination={
          <>
            <DataTablePagination table={table} />
            <DataTableDownload
              table={table}
              filenamePrefix={`${slugify(list?.title ?? listId)}-listings`}
            />
          </>
        }
        noResults={
          <EmptyState
            title="No listings found"
            description="Try adjusting your filters"
          />
        }
      >
        <DataTable table={table} />
      </DataTableLayout>
    </div>
  );
}
