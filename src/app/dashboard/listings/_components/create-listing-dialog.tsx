"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

import type { AhsListing } from "@prisma/client";

export function CreateListingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [selectedAhsListing, setSelectedAhsListing] =
    useState<AhsListing | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const createListingMutation = api.listing.create.useMutation({
    onSuccess: (newListing) => {
      toast({
        title: "Listing created",
        description: `${newListing.title} has been created.`,
      });
      router.refresh();
      router.push(`/dashboard/listings?editing=${newListing.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to create listing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAhsListingSelect = (ahsListing: AhsListing) => {
    setSelectedAhsListing(ahsListing);

    // If title is empty, use the AHS listing name
    if (!title) {
      setTitle(ahsListing.name);
    }
  };

  const syncTitleWithAhs = () => {
    if (selectedAhsListing) {
      setTitle(selectedAhsListing.name);
    }
  };

  const handleCreate = async () => {
    setIsPending(true);
    try {
      // Use the AHS listing name if title is empty
      const finalTitle =
        title || (selectedAhsListing ? selectedAhsListing.name : "New Listing");

      await createListingMutation.mutateAsync({
        title: finalTitle,
        ahsId: selectedAhsListing?.id ?? null,
      });

      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  };

  const handleCancel = () => {
    setTitle("");
    setSelectedAhsListing(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
          <P className="text-sm text-muted-foreground">
            Create a new daylily listing by providing a title or selecting from
            the AHS database.
          </P>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ahs-listing">AHS Database Listing (optional)</Label>
            <AhsListingSelect
              onSelect={handleAhsListingSelect}
              disabled={isPending}
            />
            {selectedAhsListing && (
              <P className="text-xs text-muted-foreground">
                Selected: {selectedAhsListing.name}
              </P>
            )}
          </div>

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
              placeholder={
                selectedAhsListing ? selectedAhsListing.name : "Enter a title"
              }
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
