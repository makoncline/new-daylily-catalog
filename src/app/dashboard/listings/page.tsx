"use server";

import { api } from "@/trpc/server";
import { PageHeader } from "../_components/page-header";
import { CreateListingButton } from "./_components/create-listing-button";
import { ListingsTable } from "./_components/listings-table";
import { EditListingDialog } from "./_components/edit-listing-dialog";

export default async function ListingsPage() {
  await api.listing.list.prefetch();

  return (
    <>
      <PageHeader heading="Listings" text="Manage and showcase your daylilies.">
        <CreateListingButton />
      </PageHeader>
      <ListingsTable />
      <EditListingDialog />
    </>
  );
}
