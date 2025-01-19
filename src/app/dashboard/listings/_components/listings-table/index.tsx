"use client";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { getColumns } from "./columns";
import { api } from "@/trpc/react";
import { ListingsTableSkeleton } from "./listings-table-skeleton";
import { useEditListing } from "../edit-listing-dialog";
import { CreateListingButton } from "../create-listing-button";

export function ListingsTable() {
  const { data: listings, isLoading } = api.listing.list.useQuery();
  const { data: lists } = api.listing.getUserLists.useQuery();
  const { editListing } = useEditListing();

  if (isLoading) {
    return <ListingsTableSkeleton />;
  }

  if (!listings?.length) {
    return (
      <EmptyState
        title="No listings"
        description="Create your first daylily listing"
        action={<CreateListingButton />}
      />
    );
  }

  return (
    <DataTable
      key="listings-table"
      columns={getColumns(editListing)}
      data={listings}
      options={{
        pinnedColumns: {
          left: 1,
          right: 1,
        },
      }}
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
    />
  );
}
