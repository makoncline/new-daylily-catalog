"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { LISTING_CONFIG } from "@/config/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AhsListingSelect } from "./ahs-listing-select";
import { AhsListingDisplay } from "./ahs-listing-display";
import { Muted } from "@/components/typography";

import type { ListingGetOutput } from "@/server/api/routers/listing";
import type { AhsSearchResult } from "./ahs-listing-select";
import { getErrorMessage, normalizeError } from "@/lib/error-utils";
import { useDisplayAhsListing } from "@/hooks/use-display-ahs-listing";

interface AhsListingLinkProps {
  listing: ListingGetOutput;
  onNameChange?: (name: string) => void;
}

export function AhsListingLink({
  listing,
  onNameChange,
}: AhsListingLinkProps) {
  const [isPending, setIsPending] = useState(false);
  const utils = api.useUtils();
  const linkedAhs = useDisplayAhsListing(listing);

  const { mutateAsync: linkAhsMutation } = api.listing.linkAhs.useMutation({
    onSuccess: (data) => {
      void utils.listing.get.invalidate({ id: data.id });
    },
    onError: (error, errorInfo) => {
      toast.error("Failed to save changes", { description: error.message });
      reportError({
        error: normalizeError(error),
        context: { source: "AhsListingLink", errorInfo },
      });
    },
  });

  const { mutateAsync: unlinkAhsMutation } = api.listing.unlinkAhs.useMutation({
    onSuccess: (data) => {
      void utils.listing.get.invalidate({ id: data.id });
    },
    onError: (error, errorInfo) => {
      toast.error("Failed to save changes", { description: error.message });
      reportError({
        error: normalizeError(error),
        context: { source: "AhsListingLink", errorInfo },
      });
    },
  });

  const { mutateAsync: syncAhsNameMutation } =
    api.listing.syncAhsName.useMutation({
      onSuccess: (data) => {
        void utils.listing.get.invalidate({ id: data.id });
      },
      onError: (error, errorInfo) => {
        toast.error("Failed to save changes", { description: error.message });
        reportError({
          error: normalizeError(error),
          context: { source: "AhsListingLink", errorInfo },
        });
      },
    });

  async function updateAhsListing(selected: AhsSearchResult | null) {
    setIsPending(true);
    try {
      if (selected?.name) {
        if (!selected.cultivarReferenceId) {
          toast.error("Selected listing is not available for cultivar link.");
          return;
        }

        const shouldUpdateName =
          !listing.title || listing.title === LISTING_CONFIG.DEFAULT_NAME;

        await linkAhsMutation({
          id: listing.id,
          cultivarReferenceId: selected.cultivarReferenceId,
          syncName: shouldUpdateName,
        });

        // Notify parent about name change
        if (shouldUpdateName) {
          onNameChange?.(selected.name);
        }
      } else {
        await unlinkAhsMutation({
          id: listing.id,
        });
      }

      toast.success(
        selected
          ? "Listing linked successfully"
          : "Listing unlinked successfully",
      );
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
      setIsPending(false);
    }
  }

  async function syncName() {
    setIsPending(true);
    try {
      const updatedListing = await syncAhsNameMutation({
        id: listing.id,
      });
      if (updatedListing.title) {
        onNameChange?.(updatedListing.title);
      }
      toast.success("Name synced successfully");
    } catch (error) {
      toast.error("Failed to sync name", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "AhsListingLink" },
      });
    } finally {
      setIsPending(false);
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
                <a
                  href={`https://daylilies.org/daylilies/${linkedAhs.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground font-medium hover:underline"
                >
                  {linkedAhs.name}
                </a>
              </Muted>
              <div className="flex gap-2">
                {listing.title !== linkedAhs.name && (
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
                  onClick={() => updateAhsListing(null)}
                  disabled={isPending}
                >
                  {isPending ? "Unlinking..." : "Unlink"}
                </Button>
              </div>
            </div>
            <AhsListingDisplay ahsListing={linkedAhs} />
          </CardContent>
        </Card>
      ) : (
        <div>
          <AhsListingSelect
            onSelect={(result) => updateAhsListing(result)}
            disabled={isPending}
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
