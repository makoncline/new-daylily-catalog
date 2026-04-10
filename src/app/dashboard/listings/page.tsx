"use client";

import { CreateListingButton } from "./_components/create-listing-button";
import { ListingsTable } from "./_components/listings-table";
import { EditListingDialog } from "./_components/edit-listing-dialog";
import { PageHeader } from "@/components/page-header";

export default function ListingsPage() {
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
