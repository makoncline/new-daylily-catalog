"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
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
import { AhsListingSelect } from "@/components/ahs-listing-select";
import { AhsListingDisplay } from "@/components/ahs-listing-display";
import { Separator } from "@/components/ui/separator";
import { useSetAtom } from "jotai";
import { editingListingIdAtom } from "./edit-listing-dialog";

import type { AhsListing } from "@prisma/client";

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
  const [selectedAhsListing, setSelectedAhsListing] =
    useState<AhsListing | null>(null);
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const setEditingId = useSetAtom(editingListingIdAtom);

  const { data: detailedAhsListing } = api.ahs.get.useQuery(
    { id: selectedAhsListing?.id || "" },
    {
      enabled: !!selectedAhsListing?.id,
      refetchOnWindowFocus: false,
    },
  );

  const createListingMutation = api.listing.create.useMutation({
    onSuccess: (newListing) => {
      toast({
        title: "Listing created",
        description: `${newListing.title} has been created.`,
      });

      // Close dialog
      setOpen(false);
      onOpenChange(false);

      // Set edit id
      setEditingId(newListing.id);
    },
    onError: (error) => {
      toast({
        title: "Failed to create listing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  /**
   * Handles selection of an AHS listing.
   * If title is empty, automatically uses the AHS listing name.
   */
  const handleAhsListingSelect = (ahsListing: AhsListing) => {
    setSelectedAhsListing(ahsListing);
    if (!title) {
      setTitle(ahsListing.name || "");
    }
  };

  /**
   * Syncs the title input with the selected AHS listing name.
   */
  const syncTitleWithAhs = () => {
    if (selectedAhsListing) {
      setTitle(selectedAhsListing.name || "");
    }
  };

  /**
   * Handles the create button click.
   * Submits form data to create a new listing.
   */
  const handleCreate = async () => {
    setIsPending(true);
    try {
      const finalTitle = title || selectedAhsListing?.name || "New Listing";
      await createListingMutation.mutateAsync({
        title: finalTitle,
        ahsId: selectedAhsListing?.id ?? null,
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
          <P className="text-sm text-muted-foreground">
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

            {selectedAhsListing && detailedAhsListing && (
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
              {selectedAhsListing && (
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
              placeholder={selectedAhsListing?.name || "Enter a title"}
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
            disabled={isPending || (!title && !selectedAhsListing)}
          >
            Create Listing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
