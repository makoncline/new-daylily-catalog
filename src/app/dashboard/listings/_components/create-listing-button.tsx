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

/**
 * Button component that launches the create listing dialog.
 * Handles subscription tier checks and upgrade prompts for free tier users.
 */
export function CreateListingButton() {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { isPro } = usePro();

  // Get the count of user's listings for tier limit checking
  const { data: listingCount } = api.listing.count.useQuery();

  /**
   * Handles the create button click.
   * Shows upgrade dialog if free tier limit reached, otherwise opens create dialog.
   */
  const handleCreateClick = () => {
    // Check if user is on free tier and has reached the limit
    const reachedLimit =
      !isPro &&
      (listingCount ?? 0) >= APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS;

    if (reachedLimit) {
      setShowUpgradeDialog(true);
      return;
    }

    // Show the create dialog
    setShowCreateDialog(true);
  };

  return (
    <>
      <Button onClick={handleCreateClick}>
        <Plus className="mr-2 h-4 w-4" />
        Create Listing
      </Button>

      {/* Upgrade Dialog - shown when free tier limit is reached */}
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

      {/* Conditionally render the create dialog */}
      {showCreateDialog && (
        <CreateListingDialog
          onOpenChange={(open) => {
            if (!open) setShowCreateDialog(false);
          }}
        />
      )}
    </>
  );
}
