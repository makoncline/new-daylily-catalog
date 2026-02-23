"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { P } from "@/components/typography";
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
  // Always initialize as open
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [selectedResult, setSelectedResult] = useState<AhsSearchResult | null>(
    null,
  );
  const [isPending, setIsPending] = useState(false);

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

      setOpen(false);
      onOpenChange(false);
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

  const handleCancel = () => {
    setOpen(false);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
          <P className="text-muted-foreground text-sm">
            Create a new daylily listing by providing a title or selecting from
            the AHS database.
          </P>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* AHS Listing Selection */}
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

          {/* Title Input */}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isPending || (!title.trim() && !selectedResult)}
          >
            Create Listing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
