"use client";

import { getColumns } from "./columns";
import { TABLE_CONFIG } from "@/config/constants";
import { DataTable } from "@/components/data-table";
import { api } from "@/trpc/react";
import { useEditListing } from "../edit-listing-dialog";

export function ListingsTable() {
  const { data: listings } = api.listing.list.useQuery();
  const { data: lists } = api.listing.getUserLists.useQuery();
  const { editListing } = useEditListing();

  if (!listings) return <div>Loading...</div>;

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
