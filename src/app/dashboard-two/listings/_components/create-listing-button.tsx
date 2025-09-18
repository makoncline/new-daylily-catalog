"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <Button onClick={onOpenCreate} disabled={reachedLimit}>
      <Plus className="mr-2 h-4 w-4" />
      Create Listing
    </Button>
  );
}

