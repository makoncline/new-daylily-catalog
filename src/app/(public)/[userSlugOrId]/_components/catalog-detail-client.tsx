"use client";

import * as React from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { type ColumnDef } from "@tanstack/react-table";
import { useDataTable } from "@/hooks/use-data-table";
import { CatalogNav } from "./catalog-nav";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { ContentSection } from "./content-section";
import { ImagesSection } from "./images-section";
import { ListingsTable } from "./listings-table";
import { ListingsToolbar } from "./listings-toolbar";
import { ListsSection } from "./lists-section";
import { NoResults } from "./no-results";
import { ProfileSection } from "./profile-section";
import { H2 } from "@/components/typography";
import { useRouter } from "next/navigation";
import { baseListingColumns } from "@/app/dashboard/listings/_components/columns";

type Listing = RouterOutputs["public"]["getListings"][number];
type Profile = RouterOutputs["public"]["getProfile"];

const columns = [...baseListingColumns] as ColumnDef<Listing>[];

// Profile section component
function ProfileContent({
  userSlugOrId,
  initialProfile,
}: {
  userSlugOrId: string;
  initialProfile: Profile;
}) {
  const router = useRouter();
  const { data } = api.public.getProfile.useQuery(
    { userSlugOrId },
    {
      initialData: initialProfile,
      enabled: !!userSlugOrId,
      suspense: true,
    },
  );

  const profile = data ?? initialProfile;

  // Handle redirect if we have a slug
  React.useEffect(() => {
    if (profile?.slug && userSlugOrId !== profile.slug) {
      router.replace(`/${profile.slug}`);
    }
  }, [profile?.slug, router, userSlugOrId]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        <div className="order-1 sm:order-2 sm:col-span-7">
          <ProfileSection profile={profile} />
        </div>
        <div className="order-2 sm:col-span-12 sm:hidden">
          <CatalogNav />
        </div>
        <div className="order-3 sm:order-1 sm:col-span-5">
          <ImagesSection images={profile.images} />
        </div>
      </div>
      <div className="hidden sm:block">
        <CatalogNav />
      </div>
      <ContentSection content={profile.content} />
      <ListsSection lists={profile.lists} />
    </>
  );
}

// Listings section component
function ListingsContent({
  userSlugOrId,
  initialProfile,
}: {
  userSlugOrId: string;
  initialProfile: Profile;
}) {
  const { data: listings } = api.public.getListings.useQuery(
    { userSlugOrId },
    {
      suspense: true,
    },
  );

  const table = useDataTable({
    data: listings ?? [],
    columns,
    storageKey: "catalog-listings-table",
  });

  const listsColumn = table.getColumn("lists");
  const listOptions = initialProfile.lists.map((list) => ({
    label: list.title,
    value: list.id,
    count: listings?.filter((listing) =>
      listing.lists.some(
        (listingList: { id: string }) => listingList.id === list.id,
      ),
    ).length,
  }));

  return (
    <div id="listings" className="space-y-4">
      <H2 className="text-2xl">Listings</H2>
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
  );
}

export { ProfileContent, ListingsContent };
