"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export function CreateListingButton() {
  const router = useRouter();
  const createListing = api.listing.create.useMutation({
    onSuccess: (listing) => {
      router.push(`/listings/${listing.id}/edit`);
    },
    onError: () => {
      toast.error("Failed to create listing");
    },
  });

  return (
    <Button
      onClick={() => {
        createListing.mutate({
          name: "New Listing",
          price: null,
          publicNote: null,
          privateNote: null,
          ahsId: null,
          listId: null,
        });
      }}
      disabled={createListing.status === "pending"}
    >
      {createListing.status === "pending" ? "Creating..." : "Create Listing"}
    </Button>
  );
}
