"use client";

import { type RouterOutputs } from "@/trpc/react";
import { type Table } from "@tanstack/react-table";
import { ListingCard } from "@/components/listing-card";

type Listing = RouterOutputs["public"]["getListings"][number];

interface ListingsTableProps {
  table: Table<Listing>;
}

export function ListingsTable({ table }: ListingsTableProps) {
  const rows = table.getRowModel().rows;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
      {rows.map((row, index) => (
        <div key={row.original.id}>
          <ListingCard
            listing={row.original}
            data-testid={index === 0 ? "listing-card" : undefined}
          />
        </div>
      ))}
    </div>
  );
}
