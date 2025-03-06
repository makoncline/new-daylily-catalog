"use client";

import { UserCard } from "@/components/user-card";
import { type RouterOutputs } from "@/trpc/react";
import type { PublicProfile } from "@/types/public-types";
import { useDataTable } from "@/hooks/use-data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { Flower2 } from "lucide-react";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import {
  DataTableLayout,
  DataTableLayoutSkeleton,
} from "@/components/data-table/data-table-layout";

const columns: ColumnDef<PublicProfile>[] = [
  {
    id: "name",
    accessorFn: (row) => row.title ?? "Unnamed Garden",
  },
  {
    id: "description",
    accessorFn: (row) => row.description ?? "",
  },
  {
    id: "location",
    accessorFn: (row) => row.location ?? "",
  },
];

export function CatalogsPageClient({
  catalogs,
}: {
  catalogs: RouterOutputs["public"]["getPublicProfiles"];
}) {
  const table = useDataTable({
    data: catalogs,
    columns,
    storageKey: "catalogs-table",
  });

  if (catalogs.length === 0) {
    return (
      <EmptyState
        icon={<Flower2 className="h-12 w-12 text-muted-foreground" />}
        title="No Catalogs Found"
        description="There are no daylily catalogs available at the moment."
        action={<DataTableFilterReset table={table} />}
      />
    );
  }

  return (
    <DataTableLayout
      table={table}
      data-testid="catalogs-table"
      toolbar={
        <div className="flex items-center gap-2">
          <DataTableGlobalFilter
            table={table}
            placeholder="Search catalogs..."
          />
          <DataTableFilterReset table={table} />
        </div>
      }
      pagination={<DataTablePagination table={table} />}
      noResults={
        <EmptyState
          icon={<Flower2 className="h-12 w-12 text-muted-foreground" />}
          title="No Catalogs Found"
          description="Try adjusting your filters or create a new listing"
          action={<DataTableFilterReset table={table} />}
        />
      }
    >
      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {table.getRowModel().rows.map((row, index) => (
          <UserCard
            {...row.original}
            key={row.original.id}
            priority={index < 6}
            data-testid={index === 0 ? "catalog-card" : undefined}
          />
        ))}
      </div>
    </DataTableLayout>
  );
}

export function CatalogsSkeleton() {
  return (
    <>
      <DataTableLayoutSkeleton />
    </>
  );
}
