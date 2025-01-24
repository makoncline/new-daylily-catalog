"use client";

import * as React from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { MainContent } from "@/app/(public)/_components/main-content";
import { type ColumnDef } from "@tanstack/react-table";
import { useDataTable } from "@/hooks/use-data-table";
import { useTableUrlSync } from "@/hooks/use-table-url-sync";
import { CatalogNav } from "./catalog-nav";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { ContentSection } from "./content-section";
import { CatalogDetailSkeleton } from "./catalog-detail-skeleton";
import { ImagesSection } from "./images-section";
import { ListingsTable } from "./listings-table";
import { ListingsToolbar } from "./listings-toolbar";
import { ListsSection } from "./lists-section";
import { NoResults } from "./no-results";
import { ProfileSection } from "./profile-section";

type Listing = RouterOutputs["public"]["getListings"][number];

interface CatalogDetailClientProps {
  userId: string;
}

const columns = [
  {
    id: "lists",
    accessorKey: "lists",
    filterFn: (row, id, filterValue: string[]) => {
      if (!filterValue.length) return true;
      return row.original.lists.some((list) => filterValue.includes(list.id));
    },
  },
  {
    id: "title",
    accessorFn: (row) => row.title,
  },
] as ColumnDef<Listing>[];

export function CatalogDetailClient({ userId }: CatalogDetailClientProps) {
  const { data: profile, isLoading: isLoadingProfile } =
    api.public.getProfile.useQuery({ userId });
  const { data: listings, isLoading: isLoadingListings } =
    api.public.getListings.useQuery(
      { userId },
      {
        enabled: !!userId,
      },
    );

  const table = useDataTable({
    data: listings ?? [],
    columns,
    storageKey: "catalog-listings-table",
    config: {
      enableFilters: true,
      meta: {
        filterableColumns: ["lists"],
      },
    },
  });

  useTableUrlSync(table);

  if (isLoadingProfile || isLoadingListings) {
    return <CatalogDetailSkeleton />;
  }

  if (!profile) {
    return (
      <MainContent>
        <div className="text-center text-muted-foreground">
          Catalog not found
        </div>
      </MainContent>
    );
  }

  const listsColumn = table.getColumn("lists");
  const listOptions = profile.lists.map((list) => ({
    label: list.title,
    value: list.id,
    count: listings?.filter((listing) =>
      listing.lists.some(
        (listingList: { id: string }) => listingList.id === list.id,
      ),
    ).length,
  }));

  return (
    <MainContent>
      <div className="space-y-8">
        <CatalogNav />
        <ProfileSection profile={profile} />
        <ImagesSection images={profile.images} />
        <ContentSection content={profile.content} />
        <ListsSection lists={profile.lists} table={table} />

        {/* Listings */}
        <div id="listings" className="space-y-4">
          <h2 className="text-2xl font-semibold">Listings</h2>
          <DataTableLayout
            table={table}
            toolbar={
              <ListingsToolbar
                table={table}
                listsColumn={listsColumn}
                listOptions={listOptions}
              />
            }
            pagination={<DataTablePagination table={table} />}
            noResults={
              <NoResults
                filtered={
                  table.getState().globalFilter !== "" ||
                  table.getState().columnFilters.length > 0
                }
              />
            }
          >
            <ListingsTable table={table} />
          </DataTableLayout>
        </div>
      </div>
    </MainContent>
  );
}
