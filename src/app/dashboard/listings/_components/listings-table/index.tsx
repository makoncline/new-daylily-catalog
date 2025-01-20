"use client";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { getColumns } from "./columns";
import { api } from "@/trpc/react";
import { ListingsTableSkeleton } from "./listings-table-skeleton";
import { CreateListingButton } from "../create-listing-button";
import { useEditListing } from "../edit-listing-dialog";

function NoResults() {
  return (
    <EmptyState
      title="No listings found"
      description="Try adjusting your filters or create a new listing"
      action={<CreateListingButton />}
    />
  );
}

export function ListingsTable() {
  const { data: listings, isLoading } = api.listing.list.useQuery();
  const { data: lists } = api.list.list.useQuery();
  const { editListing } = useEditListing();
  const columns = getColumns(editListing);

  if (isLoading) {
    return <ListingsTableSkeleton />;
  }

  if (!listings?.length) {
    return (
      <EmptyState
        title="No listings"
        description="Create your first listing to start selling"
        action={<CreateListingButton />}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={listings}
      options={{
        pinnedColumns: {
          left: 1,
          right: 1,
        },
        storageKey: "listings-table",
      }}
      filterPlaceholder="Filter listings..."
      filterableColumns={
        lists
          ? [
              {
                id: "lists",
                title: "Lists",
                options: lists.map((list) => ({
                  label: list.name,
                  value: list.id,
                  count: listings.filter((listing) =>
                    listing.lists.some((l) => l.id === list.id),
                  ).length,
                })),
              },
            ]
          : undefined
      }
      noResults={<NoResults />}
    />
  );
}
