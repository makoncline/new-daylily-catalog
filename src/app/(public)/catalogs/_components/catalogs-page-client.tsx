"use client";

import { UserCard, UserCardSkeleton } from "@/components/user-card";
import { api, type RouterOutputs } from "@/trpc/react";
import type { PublicProfile } from "@/types/public-types";
import { useDataTable } from "@/hooks/use-data-table";
import { type ColumnDef } from "@tanstack/react-table";
import {
  DataTableGlobalFilter,
  DataTableGlobalFilterSkeleton,
} from "@/components/data-table/data-table-global-filter";
import {
  DataTablePagination,
  DataTablePaginationSkeleton,
} from "@/components/data-table/data-table-pagination";
import { PageHeader } from "@/app/dashboard/_components/page-header";
import { MainContent } from "@/app/(public)/_components/main-content";
import { EmptyState } from "@/components/empty-state";
import { Flower2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { useViewListing } from "@/components/view-listing-dialog";

const columns: ColumnDef<PublicProfile>[] = [
  {
    id: "name",
    accessorFn: (row) => row.title ?? "Unnamed Garden",
  },
  {
    id: "intro",
    accessorFn: (row) => row.description ?? "",
  },
  {
    id: "location",
    accessorFn: (row) => row.location ?? "",
  },
];

function CatalogsGrid({
  profiles,
}: {
  profiles: RouterOutputs["public"]["getPublicProfiles"];
}) {
  const table = useDataTable({
    data: profiles,
    columns,
    storageKey: "catalogs-table",
  });
  const { closeViewListing } = useViewListing();

  const handleReset = () => {
    table.resetColumnFilters(true);
    table.resetGlobalFilter(true);
    closeViewListing();
  };

  return (
    <>
      <div className="flex items-center">
        <DataTableGlobalFilter table={table} placeholder="Search catalogs..." />
        <DataTableFilterReset table={table} />
      </div>

      {table.getRowModel().rows.length === 0 ? (
        <EmptyState
          icon={<Flower2 className="h-12 w-12 text-muted-foreground" />}
          title="No Catalogs Found"
          description="Try adjusting your filters or create a new listing"
          action={<Button onClick={handleReset}>Reset Filters</Button>}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {table.getRowModel().rows.map((row, index) => (
            <div key={row.original.id} className="mx-auto w-full max-w-[400px]">
              <UserCard {...row.original} priority={index < 6} />
            </div>
          ))}
        </div>
      )}

      <DataTablePagination table={table} />
    </>
  );
}

function CatalogsLoading() {
  return (
    <>
      <div className="flex items-center justify-end">
        <DataTableGlobalFilterSkeleton />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="mx-auto w-full max-w-[400px]">
            <UserCardSkeleton />
          </div>
        ))}
      </div>

      <DataTablePaginationSkeleton />
    </>
  );
}

export function CatalogsPageClient() {
  const { data: profiles, isLoading } = api.public.getPublicProfiles.useQuery();

  return (
    <MainContent>
      <PageHeader
        heading="Daylily Catalogs"
        text="Browse beautiful daylily collections from growers around the world."
      />

      {isLoading ? (
        <CatalogsLoading />
      ) : profiles ? (
        <CatalogsGrid profiles={profiles} />
      ) : (
        <EmptyState
          icon={<Flower2 className="h-12 w-12 text-muted-foreground" />}
          title="No Catalogs Found"
          description="There are no daylily catalogs available at the moment."
          action={
            <Button onClick={() => window.location.reload()}>Refresh</Button>
          }
        />
      )}
    </MainContent>
  );
}
