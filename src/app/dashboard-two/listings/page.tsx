"use client";

import React, { useCallback, useState } from "react";
import { SignedIn } from "@clerk/nextjs";
import { DashboardProvider } from "@/app/dashboard-two/_components/listings-init-provider";
import { DashboardTwoListingsProvider, useDashboardTwoListings } from "./_components/listings-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { CreateListingButton } from "./_components/create-listing-button";
import { CreateListingDialog } from "./_components/create-listing-dialog";
import { ListingsTable } from "./_components/listings-table";
import { EditListingDialog } from "./_components/edit-listing-dialog";
import { useEditListing } from "@/app/dashboard/listings/_components/edit-listing-dialog";

export default function Page() {
  return (
    <SignedIn>
      <DashboardProvider>
        <DashboardTwoListingsProvider>
          <ListingsPageContent />
        </DashboardTwoListingsProvider>
      </DashboardProvider>
    </SignedIn>
  );
}

function ListingsPageContent() {
  const { listings, lists, listingCount, isLoading, isPro, createListing, deleteListing } =
    useDashboardTwoListings();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  // Use URL param as the single source of truth for edit dialog state
  const { editingId, editListing, closeEditListing } = useEditListing();

  const onOpenCreate = useCallback(() => setShowCreateDialog(true), []);

  return (
    <>
      <PageHeader heading="Listings" text="Manage and showcase your daylilies.">
        <CreateListingButton
          listingCount={listingCount}
          isPro={isPro}
          onOpenCreate={onOpenCreate}
        />
      </PageHeader>

      <ListingsTable
        data={listings}
        lists={lists}
        isLoading={isLoading}
        onEdit={(id) => editListing(id)}
        onDelete={async (id) => {
          await deleteListing(id);
        }}
      />

      <CreateListingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={async ({ title, ahsId }) => {
          const { id } = await createListing({ title, ahsId });
          setShowCreateDialog(false);
          editListing(id);
        }}
      />
      <EditListingDialog listingId={editingId} open={!!editingId} onOpenChange={(open) => (!open ? closeEditListing() : null)} />
    </>
  );
}
