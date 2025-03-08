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
import { APP_CONFIG, PRO_FEATURES } from "@/config/constants";
import { usePro } from "@/hooks/use-pro";
import { CheckoutButton } from "@/components/checkout-button";
import { CreateListingDialog } from "./create-listing-dialog";

export function CreateListingButton() {
  const { toast } = useToast();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { isPro } = usePro();

  const { data: listingCount } = api.listing.count.useQuery();

  const handleCreateClick = () => {
    // Check if user is on free tier and has reached the limit
    const reachedLimit =
      !isPro &&
      (listingCount ?? 0) >= APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS;

    if (reachedLimit) {
      setShowUpgradeDialog(true);
      return;
    }

    // Show the create dialog instead of immediately creating a listing
    setShowCreateDialog(true);
  };

  return (
    <>
      <Button onClick={handleCreateClick} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Create Listing
      </Button>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
            <DialogDescription>
              You&apos;ve reached the limit of{" "}
              {APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS} listings for free
              accounts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <H3 className="text-center">Upgrade to Pro</H3>
            <p className="text-center text-sm text-muted-foreground">
              Upgrade to a Pro account to create unlimited listings and unlock
              other premium features.
            </p>
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
            <div className="flex justify-center">
              <CheckoutButton />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Listing Dialog */}
      <CreateListingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
}
