"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { H3 } from "@/components/typography";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import { useEditListing } from "./edit-listing-dialog";
import { APP_CONFIG, PRO_FEATURES } from "@/config/constants";
import { usePro } from "@/hooks/use-pro";
import { CheckoutButton } from "@/components/checkout-button";

export function CreateListingButton() {
  const { editListing } = useEditListing();
  const { toast } = useToast();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { isPro } = usePro();

  const { data: listingCount } = api.listing.count.useQuery();

  const createListing = api.listing.create.useMutation({
    onError: () => {
      toast({
        title: "Failed to create listing",
        variant: "destructive",
      });
    },
  });

  const handleCreate = async () => {
    // Check if user is on free tier and has reached the limit
    const reachedLimit =
      !isPro &&
      (listingCount ?? 0) >= APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS;

    if (reachedLimit) {
      setShowUpgradeDialog(true);
      return;
    }

    try {
      const listing = await createListing.mutateAsync();
      editListing(listing.id);
    } catch {
      // Error is already handled by the mutation's onError
    }
  };

  return (
    <>
      <Button onClick={handleCreate} disabled={createListing.isPending}>
        <Plus className="mr-2 h-4 w-4" />
        {createListing.isPending ? "Creating..." : "Create Listing"}
      </Button>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upgrade to Pro</DialogTitle>
            <DialogDescription>
              You&apos;ve reached the free tier limit of{" "}
              {APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS} listings. Upgrade to
              Pro for unlimited listings and more features.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <H3 className="text-xl">Pro Features</H3>
              <ul className="space-y-2 text-sm">
                {PRO_FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <li key={feature.id} className="flex items-center">
                      <Icon className="mr-2 h-4 w-4" />
                      {feature.text}
                    </li>
                  );
                })}
              </ul>
            </div>

            <CheckoutButton size="lg" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
