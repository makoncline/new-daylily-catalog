"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { useEditListing } from "./edit-listing-dialog";
import { Plus } from "lucide-react";

export function CreateListingButton() {
  const { editListing } = useEditListing();
  const { toast } = useToast();

  const createListing = api.listing.create.useMutation({
    onError: () => {
      toast({
        title: "Failed to create listing",
        variant: "destructive",
      });
    },
  });

  const handleCreate = async () => {
    try {
      const listing = await createListing.mutateAsync();
      editListing(listing.id);
    } catch {
      // Error is already handled by the mutation's onError
    }
  };

  return (
    <Button onClick={handleCreate} disabled={createListing.isPending}>
      <Plus className="mr-2 h-4 w-4" />
      {createListing.isPending ? "Creating..." : "Create Listing"}
    </Button>
  );
}
