"use client";

import { type RouterOutputs } from "@/trpc/react";
import { type Table } from "@tanstack/react-table";
import { ListingCard } from "@/components/listing-card";

type Listing = RouterOutputs["public"]["getListings"][number];

interface ListingsTableProps {
  table: Table<Listing>;
}

export function ListingsTable({ table }: ListingsTableProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
      {table.getRowModel().rows.map((row) => (
        <div key={row.original.id} className="w-full">
          <ListingCard listing={row.original} />
        </div>
      ))}
    </div>
  );
}
