"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LISTING_CONFIG } from "@/config/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Muted } from "@/components/typography";
import { AhsListingSelectTwo } from "./ahs-listing-select-two";
import { AhsListingDisplayTwo } from "./ahs-listing-display-two";
import type { ListingRow } from "./types";
import { useDashboardTwoListings } from "./listings-provider";
import type { RouterOutputs } from "@/trpc/react";

type AhsSearchRow = RouterOutputs["dashboardTwo"]["searchAhs"][number];

interface AhsListingLinkTwoProps {
  listing: ListingRow;
  onUpdate?: (updated: Partial<ListingRow>) => void;
  onNameChange?: (name: string) => void;
}

export function AhsListingLinkTwo({
  listing,
  onUpdate,
  onNameChange,
}: AhsListingLinkTwoProps) {
  const [isPending, setIsPending] = useState(false);
  const { setListingAhsId, updateListing } = useDashboardTwoListings();

  async function updateAhsListing(
    ahsId: string | null,
    selected: AhsSearchRow | null,
  ) {
    setIsPending(true);
    try {
      await setListingAhsId({ id: listing.id, ahsId });
      if (ahsId && selected?.name) {
        const shouldUpdateName =
          !listing.title || listing.title === LISTING_CONFIG.DEFAULT_NAME;
        if (shouldUpdateName) {
          await updateListing({
            id: listing.id,
            data: { title: selected.name },
          });
          onNameChange?.(selected.name);
        }
      } else {
        onUpdate?.({ ahsListing: null });
      }
      toast.success(
        ahsId ? "Listing linked successfully" : "Listing unlinked successfully",
      );
    } catch (error) {
      toast.error(
        ahsId ? "Failed to link listing" : "Failed to unlink listing",
      );
    } finally {
      setIsPending(false);
    }
  }

  async function syncName() {
    setIsPending(true);
    try {
      const name = listing.ahsListing?.name ?? "";
      await updateListing({ id: listing.id, data: { title: name } });
      if (name) onNameChange?.(name);
      onUpdate?.({ title: name });
      toast.success("Name synced successfully");
    } catch (error) {
      toast.error("Failed to sync name");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      {listing.ahsListing ? (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <Muted>
                Linked to{" "}
                <a
                  href={`https://daylilies.org/daylilies/${listing.ahsListing.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground font-medium hover:underline"
                >
                  {listing.ahsListing.name}
                </a>
              </Muted>
              <div className="flex gap-2">
                {listing.title !== (listing.ahsListing.name ?? "") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={syncName}
                    disabled={isPending}
                  >
                    {isPending ? "Syncing..." : "Sync Name"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateAhsListing(null, null)}
                  disabled={isPending}
                >
                  {isPending ? "Unlinking..." : "Unlink"}
                </Button>
              </div>
            </div>
            <AhsListingDisplayTwo ahsListing={listing.ahsListing} />
          </CardContent>
        </Card>
      ) : (
        <div>
          <AhsListingSelectTwo
            onSelect={(selected) => updateAhsListing(selected.id, selected)}
            disabled={isPending}
          />
        </div>
      )}
    </div>
  );
}

export function AhsListingLinkTwoSkeleton() {
  return (
    <div className="space-y-2">
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="text-muted-foreground text-sm">
            <Skeleton className="h-4 w-64" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
