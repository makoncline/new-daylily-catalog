"use client";

import { DataTable } from "@/components/data-table";
import { getColumns } from "./columns";
import { api } from "@/trpc/react";
import { ListingsTableSkeleton } from "./listings-table-skeleton";
import { useEditListing } from "../edit-listing-dialog";
import { TABLE_CONFIG } from "@/config/constants";

export function ListingsTable() {
  const { data: listings, isLoading } = api.listing.list.useQuery();
  const { data: lists } = api.listing.getUserLists.useQuery();
  const { editListing } = useEditListing();

  if (isLoading) {
    return <ListingsTableSkeleton />;
  }

  if (!listings) return null;

  return (
    <DataTable
      columns={getColumns(editListing)}
      data={listings}
      options={{
        pinnedColumns: {
          left: 1,
          right: 1,
        },
        pagination: {
          pageIndex: TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX,
          pageSize: TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
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
