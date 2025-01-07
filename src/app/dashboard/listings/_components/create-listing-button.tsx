"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";

export function CreateListingButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const createListing = api.listing.create.useMutation({
    onSuccess: (listing) => {
      const params = new URLSearchParams(searchParams);
      params.set("editing", listing.id);
      router.replace(`?${params.toString()}`);
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
