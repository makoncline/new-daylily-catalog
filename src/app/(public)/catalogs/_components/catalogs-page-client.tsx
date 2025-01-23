"use client";

import { UserCard, UserCardSkeleton } from "@/components/user-card";
import { api } from "@/trpc/react";
import type { PublicProfile } from "@/types/public-types";
import { useDataTable } from "@/hooks/use-data-table";
import { type ColumnDef, type TableOptions } from "@tanstack/react-table";
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

const columns: ColumnDef<PublicProfile>[] = [
  {
    id: "name",
    accessorFn: (row) => row.name ?? "Unnamed Garden",
  },
  {
    id: "intro",
    accessorFn: (row) => row.intro ?? "",
  },
  {
    id: "location",
    accessorFn: (row) => row.location ?? "",
  },
];

const config: Partial<TableOptions<PublicProfile>> = {
  initialState: {
    pagination: {
      pageSize: 12,
    },
  },
};

function CatalogsGrid({ profiles }: { profiles: PublicProfile[] }) {
  const table = useDataTable({
    data: profiles,
    columns,
    storageKey: "catalogs-table",
    config,
  });

  return (
    <>
      <div className="flex items-center justify-end">
        <DataTableGlobalFilter table={table} placeholder="Search catalogs..." />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {table.getRowModel().rows.map((row, index) => (
          <div key={row.original.id} className="mx-auto w-full max-w-[400px]">
            <UserCard
              id={row.original.id}
              name={row.original.name}
              intro={row.original.intro}
              location={row.original.location}
              images={row.original.images}
              listingCount={row.original.listingCount}
              listCount={row.original.listCount}
              hasActiveSubscription={row.original.hasActiveSubscription}
              priority={index < 6}
            />
          </div>
        ))}
      </div>

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
        <div className="text-center text-muted-foreground">
          No catalogs found
        </div>
      )}
    </MainContent>
  );
}
