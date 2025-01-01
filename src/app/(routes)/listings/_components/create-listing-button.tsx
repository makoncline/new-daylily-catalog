"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { LISTING_CONFIG } from "@/config/constants";

export function CreateListingButton() {
  const router = useRouter();
  const { toast } = useToast();
  const createListing = api.listing.create.useMutation({
    onSuccess: (listing) => {
      router.push(`/listings/${listing.id}/edit`);
    },
    onError: () => {
      toast({
        title: "Failed to create listing",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      onClick={() => {
        createListing.mutate();
      }}
      disabled={createListing.status === "pending"}
    >
      {createListing.status === "pending" ? "Creating..." : "Create Listing"}
    </Button>
  );
}
