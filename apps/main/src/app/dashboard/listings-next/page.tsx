"use client";

import { useEffect } from "react";
import { CreateListingButton } from "../listings/_components/create-listing-button";
import { ListingsTable } from "../listings/_components/listings-table";
import { EditListingDialog } from "../listings/_components/edit-listing-dialog";
import { PageHeader } from "@/components/page-header";
import { logDashboardTiming } from "@/app/dashboard/_lib/dashboard-timing";
import { useListingsNextUrlState } from "./use-listings-next-url-state";
import { ListingsNextUrlEffects } from "./listings-next-url-effects";

export default function ListingsNextPage() {
  const state = useListingsNextUrlState();

  useEffect(() => {
    logDashboardTiming("listings-next-page.mounted");
  }, []);

  return (
    <>
      <PageHeader heading="Listings" text="Manage and showcase your daylilies.">
        <CreateListingButton
          createDialogOpen={state.creating}
          onCreateDialogOpenChange={state.setCreating}
          onCreated={state.openCreatedListing}
        />
      </PageHeader>

      <ListingsTable
        onCreate={() => state.setCreating(true)}
        onEdit={state.setEditingId}
        useNativeUrlHistory
        viewState={{
          searchMode: state.searchMode,
          setSearchMode: state.setSearchMode,
          searchCollapsed: state.searchCollapsed,
          setSearchCollapsed: state.setSearchCollapsed,
        }}
      />

      <EditListingDialog
        state={{
          editingId: state.editingId,
          onClose: () => state.setEditingId(null),
          onEntityChangeRejected: state.setEditingId,
        }}
      />
      <ListingsNextUrlEffects
        editingId={state.editingId}
        showImages={Boolean(state.editingId) && state.imageSectionRequested}
      />
    </>
  );
}
