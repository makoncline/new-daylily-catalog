"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { getColumns } from "./columns";
import { api } from "@/trpc/react";
import { ListingsTableSkeleton } from "./listings-table-skeleton";
import { useEditListing } from "../edit-listing-dialog";
import { TABLE_CONFIG } from "@/config/constants";

export function ListingsTable() {
  const searchParams = useSearchParams();
  const [pageIndex, setPageIndex] = useState<number>(
    Number(searchParams.get("page")) ||
      TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX,
  );
  const [pageSize, setPageSize] = useState<number>(
    Number(searchParams.get("size")) ||
      TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
  );

  const { data: listings, isLoading } = api.listing.list.useQuery({
    pageIndex,
    pageSize,
  });
  const { data: lists } = api.listing.getUserLists.useQuery();
  const { editListing } = useEditListing();

  const handlePaginationChange = (
    newPageIndex: number,
    newPageSize: number,
  ) => {
    setPageIndex(newPageIndex);
    setPageSize(newPageSize);
  };

  if (isLoading) {
    return <ListingsTableSkeleton />;
  }

  if (!listings) return null;

  return (
    <DataTable
      columns={getColumns(editListing)}
      data={listings.items}
      options={{
        pinnedColumns: {
          left: 1,
          right: 1,
        },
        pagination: {
          pageIndex,
          pageSize,
          totalCount: listings.count,
        },
      }}
      onPaginationChange={handlePaginationChange}
      filterableColumns={
        lists
          ? [
              {
                id: "lists",
                title: "Lists",
                options: lists.map((list) => ({
                  label: list.name,
                  value: list.id,
                  count: listings.items.filter((listing) =>
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
