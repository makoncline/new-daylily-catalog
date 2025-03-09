"use client";

import { api } from "@/trpc/react";
import { PageHeader } from "../_components/page-header";
import { CreateListingButton } from "./_components/create-listing-button";
import { ListingsTable } from "./_components/listings-table";
import { EditListingDialog } from "./_components/edit-listing-dialog";
import { DataTableLayoutSkeleton } from "@/components/data-table/data-table-layout";

export default function ListingsPage() {
  // Fetch data on the client side instead of server prefetching
  const { isLoading } = api.listing.list.useQuery();

  return (
    <>
      <PageHeader heading="Listings" text="Manage and showcase your daylilies.">
        <CreateListingButton />
      </PageHeader>

      {isLoading ? <DataTableLayoutSkeleton /> : <ListingsTable />}

      <EditListingDialog />
    </>
  );
}
