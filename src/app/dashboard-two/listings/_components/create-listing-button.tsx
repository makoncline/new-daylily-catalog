"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { APP_CONFIG } from "@/config/constants";

export function CreateListingButton({
  listingCount = 0,
  isPro = false,
  onOpenCreate,
}: {
  listingCount?: number;
  isPro?: boolean;
  onOpenCreate: () => void;
}) {
  const reachedLimit =
    !isPro && listingCount >= APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS;

  const button = (
    <Button onClick={onOpenCreate} disabled={reachedLimit}>
      <Plus className="mr-2 h-4 w-4" />
      Create Listing
    </Button>
  );

  if (reachedLimit) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>
              You've reached the free tier limit of{" "}
              {APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS} listings.
            </p>
            <p>Upgrade to Pro to create unlimited listings.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
