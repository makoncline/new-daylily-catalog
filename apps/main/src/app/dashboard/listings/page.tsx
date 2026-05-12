"use client";

import { useEffect } from "react";
import { CreateListingButton } from "./_components/create-listing-button";
import { ListingsTable } from "./_components/listings-table";
import { EditListingDialog } from "./_components/edit-listing-dialog";
import { PageHeader } from "@/components/page-header";
import { logDashboardTiming } from "@/app/dashboard/_lib/dashboard-timing";

export default function ListingsPage() {
  useEffect(() => {
    logDashboardTiming("listings-page.mounted");
  }, []);

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
