"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LISTING_CONFIG } from "@/config/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AhsListingSelect } from "./ahs-listing-select";
import { AhsListingDisplay } from "./ahs-listing-display";
import { Muted } from "@/components/typography";

import type { AhsSearchResult } from "./ahs-listing-select";
import {
  getErrorMessage,
  normalizeError,
  reportError,
} from "@/lib/error-utils";
import type { RouterOutputs } from "@/trpc/react";
import type { OptimizedImageSource } from "@/components/optimized-image";
import {
  linkAhs,
  syncAhsName,
  unlinkAhs,
} from "@/app/dashboard/_lib/dashboard-db/listings-collection";

type CultivarReferenceAhsListing =
  RouterOutputs["dashboardDb"]["cultivarReference"]["listForUserListings"][number]["ahsListing"];

interface AhsListingLinkProps {
  listing: RouterOutputs["dashboardDb"]["listing"]["list"][number];
  linkedAhs: CultivarReferenceAhsListing | null;
  cultivarReferenceImage?: OptimizedImageSource | null;
  onNameChange?: (name: string) => void;
  onMutationSuccess?: () => void;
}

export function AhsListingLink({
  listing,
  linkedAhs,
  cultivarReferenceImage,
  onNameChange,
  onMutationSuccess,
}: AhsListingLinkProps) {
  const [isSaving, setIsSaving] = useState(false);

  async function updateAhsListing(selected: AhsSearchResult | null) {
    setIsSaving(true);
    try {
      if (selected?.name) {
        if (!selected.cultivarReferenceId) {
          toast.error("Selected listing is not available for cultivar link.");
          return;
        }

        const shouldUpdateName =
          !listing.title || listing.title === LISTING_CONFIG.DEFAULT_NAME;

        await linkAhs({
          id: listing.id,
          cultivarReferenceId: selected.cultivarReferenceId,
          syncName: shouldUpdateName,
        });

        // Notify parent about name change
        if (shouldUpdateName) {
          onNameChange?.(selected.name);
        }
      } else {
        await unlinkAhs({
          id: listing.id,
        });
      }

      toast.success(
        selected
          ? "Listing linked successfully"
          : "Listing unlinked successfully",
      );
      onMutationSuccess?.();
    } catch (error) {
      toast.error(
        selected ? "Failed to link listing" : "Failed to unlink listing",
        { description: getErrorMessage(error) },
      );
      reportError({
        error: normalizeError(error),
        context: { source: "AhsListingLink" },
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function syncName() {
    setIsSaving(true);
    try {
      const updatedListing = await syncAhsName({
        id: listing.id,
      });
      if (updatedListing.title) {
        onNameChange?.(updatedListing.title);
      }
      toast.success("Name synced successfully");
      onMutationSuccess?.();
    } catch (error) {
      toast.error("Failed to sync name", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "AhsListingLink" },
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {linkedAhs ? (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <Muted>
                Linked to{" "}
                <span className="text-foreground font-medium">
                  {linkedAhs.name}
                </span>
              </Muted>
              <div className="flex gap-2">
                {listing.title !== linkedAhs.name && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={syncName}
                    disabled={isSaving}
                  >
                    {isSaving ? "Syncing..." : "Sync Name"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateAhsListing(null)}
                  disabled={isSaving}
                >
                  {isSaving ? "Unlinking..." : "Unlink"}
                </Button>
              </div>
            </div>
            <AhsListingDisplay
              ahsListing={linkedAhs}
              cultivarReferenceImage={cultivarReferenceImage}
            />
          </CardContent>
        </Card>
      ) : (
        <div>
          <AhsListingSelect
            onSelect={(result) => updateAhsListing(result)}
            disabled={isSaving}
          />
        </div>
      )}
    </div>
  );
}

export function AhsListingLinkSkeleton() {
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
