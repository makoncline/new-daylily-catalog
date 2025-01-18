"use client";

import { type ListingGetOutput } from "@/server/api/routers/listing";
import { getColumns } from "./columns";
import { TABLE_CONFIG } from "@/config/constants";
import { DataTable } from "@/components/data-table";
import { api } from "@/trpc/react";

interface ListingsTableProps {
  initialListings: ListingGetOutput[];
  onEdit?: (id: string | null) => void;
}

export function ListingsTable({ initialListings, onEdit }: ListingsTableProps) {
  const { data: lists } = api.listing.getUserLists.useQuery();

  return (
    <DataTable
      columns={getColumns(onEdit)}
      data={initialListings}
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
                  count: initialListings.filter((listing) =>
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
