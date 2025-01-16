"use client";

import { type ListingGetOutput } from "@/server/api/routers/listing";
import { getColumns } from "./columns";
import { TABLE_CONFIG } from "@/config/constants";
import { DataTable } from "@/components/data-table";

interface ListingsTableProps {
  initialListings: ListingGetOutput[];
  onEdit?: (id: string | null) => void;
}

export function ListingsTable({ initialListings, onEdit }: ListingsTableProps) {
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
    />
  );
}
