"use client";

import { useEffect, useCallback, useLayoutEffect, useRef } from "react";
import { CreateListingButton } from "./_components/create-listing-button";
import { useCreateListing } from "./_components/create-listing-dialog";
import { ListingsTable } from "./_components/listings-table";
import { useEditListing } from "./_components/edit-listing-dialog";
import { PageHeader } from "@/components/page-header";
import { logDashboardTiming } from "@/app/dashboard/_lib/dashboard-timing";

export default function ListingsPage() {
  const { editListing } = useEditListing();
  const { openCreateListing } = useCreateListing();
  const editListingRef = useRef(editListing);
  useLayoutEffect(() => {
    editListingRef.current = editListing;
  }, [editListing]);
  const handleEdit = useCallback((id: string) => {
    editListingRef.current(id);
  }, []);
  useEffect(() => {
    logDashboardTiming("listings-page.mounted");
  }, []);

  return (
    <div data-testid="listings-dashboard" className="flex flex-col gap-4">
      <PageHeader heading="Listings" text="Manage and showcase your daylilies.">
        <CreateListingButton onCreate={openCreateListing} />
      </PageHeader>
      <ListingsTable onEdit={handleEdit} onCreate={openCreateListing} />
    </div>
  );
}
