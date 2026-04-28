"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AhsListingSelect,
  type AhsSearchResult,
} from "@/components/ahs-listing-select";
import { AhsListingDisplay } from "@/components/ahs-listing-display";
import { Separator } from "@/components/ui/separator";
import { useSetAtom } from "jotai";
import { editingListingIdAtom } from "./edit-listing-dialog";
import { getErrorMessage, normalizeError, reportError } from "@/lib/error-utils";
import { APP_CONFIG } from "@/config/constants";
import { insertListing } from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { useManagedDialogOpen } from "@/hooks/use-managed-dialog-open";
import { ManagedCreateDialog } from "@/app/dashboard/_components/managed-create-dialog";

/**
 * Dialog for creating a new daylily listing.
 * Allows selecting an AHS database entry and/or setting a custom title.
 * After successful creation, automatically opens the edit dialog for further customization.
 */
export function CreateListingDialog({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [selectedResult, setSelectedResult] = useState<AhsSearchResult | null>(
    null,
  );
  const [isPending, setIsPending] = useState(false);
  const { closeDialog, handleOpenChange, open } =
    useManagedDialogOpen(onOpenChange);

  const setEditingId = useSetAtom(editingListingIdAtom);

  const { data: detailedAhsListing } = api.dashboardDb.ahs.get.useQuery(
    {
      id: selectedResult?.id ?? "",
    },
    {
      enabled: !!selectedResult?.id,
    },
  );

  /**
   * Handles selection of an AHS listing.
   * If title is empty, automatically uses the AHS listing name.
   */
  const handleAhsListingSelect = (result: AhsSearchResult) => {
    setSelectedResult(result);
    if (!title) {
      setTitle(result.name ?? "");
    }
  };

  /**
   * Syncs the title input with the selected AHS listing name.
   */
  const syncTitleWithAhs = () => {
    if (selectedResult) {
      setTitle(selectedResult.name ?? "");
    }
  };

  /**
   * Handles the create button click.
   * Submits form data to create a new listing.
   */
  const handleCreate = async () => {
    setIsPending(true);
    try {
      const normalizedTitle = title.trim();
      const selectedName = selectedResult?.name?.trim();
      const finalTitle =
        normalizedTitle.length > 0
          ? normalizedTitle
          : selectedName && selectedName.length > 0
            ? selectedName
            : APP_CONFIG.LISTING.DEFAULT_NAME;

      if (selectedResult && !selectedResult.cultivarReferenceId) {
        toast.error("Selected listing is not available for cultivar link.");
        return;
      }

      const newListing = await insertListing({
        title: finalTitle,
        cultivarReferenceId: selectedResult?.cultivarReferenceId ?? null,
      });

      toast.success("Listing created", {
        description: `${newListing.title} has been created.`,
      });

      closeDialog();
      setEditingId(newListing.id);
    } catch (error) {
      toast.error("Failed to create listing", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "CreateListingDialog" },
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <ManagedCreateDialog
      cancelDisabled={isPending}
      confirmDisabled={isPending || (!title.trim() && !selectedResult)}
      confirmLabel="Create Listing"
      description="Create a new daylily listing by providing a title or selecting from the AHS database."
      onCancel={closeDialog}
      onConfirm={handleCreate}
      onOpenChange={handleOpenChange}
      open={open}
      title="Create New Listing"
    >
      <div className="space-y-2">
        <Label htmlFor="ahs-listing">AHS Database Listing (optional)</Label>
        <AhsListingSelect
          onSelect={handleAhsListingSelect}
          disabled={isPending}
        />

        {selectedResult && detailedAhsListing && (
          <div className="mt-4">
            <Separator className="my-4" />
            <AhsListingDisplay ahsListing={detailedAhsListing} />
            <Separator className="my-4" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="title">Listing Title</Label>
          {selectedResult && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={syncTitleWithAhs}
              disabled={isPending}
            >
              Sync with AHS name
            </Button>
          )}
        </div>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={selectedResult?.name ?? "Enter a title"}
          disabled={isPending}
        />
      </div>
    </ManagedCreateDialog>
  );
}
