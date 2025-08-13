"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { LISTING_CONFIG } from "@/config/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AhsListingSelect } from "./ahs-listing-select";
import { AhsListingDisplay } from "./ahs-listing-display";
import { Muted } from "@/components/typography";

import type { ListingGetOutput } from "@/server/api/routers/listing";
import type { AhsListing } from "@prisma/client";
import { getErrorMessage, normalizeError } from "@/lib/error-utils";

interface AhsListingLinkProps {
  listing: ListingGetOutput;
  onUpdate?: (updatedListing: ListingGetOutput) => void;
  onNameChange?: (name: string) => void;
}

export function AhsListingLink({
  listing,
  onUpdate,
  onNameChange,
}: AhsListingLinkProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const { mutateAsync: updateListingMutation } = api.listing.update.useMutation(
    {
      onSuccess: () => {
        toast({
          title: "Changes saved",
        });
      },
      onError: (error, errorInfo) => {
        toast({
          title: "Failed to save changes",
          description: error.message,
          variant: "destructive",
        });
        reportError({
          error: normalizeError(error),
          context: { source: "AhsListingLink", errorInfo },
        });
      },
    },
  );

  async function updateAhsListing(
    ahsId: string | null,
    ahsListing: AhsListing | null,
  ) {
    setIsPending(true);
    try {
      if (ahsId && ahsListing?.name) {
        // When linking, update both ahsId and name if needed
        const shouldUpdateName =
          !listing.title || listing.title === LISTING_CONFIG.DEFAULT_NAME;

        const data: { ahsId: string; title?: string } = {
          ahsId,
        };

        if (shouldUpdateName) {
          data.title = ahsListing.name;
        }

        const updatedListing = await updateListingMutation({
          id: listing.id,
          data,
        });

        // Notify parent about name change
        if (shouldUpdateName) {
          onNameChange?.(ahsListing.name);
        }
        onUpdate?.(updatedListing);
      } else {
        // When unlinking, only update ahsId
        const updatedListing = await updateListingMutation({
          id: listing.id,
          data: {
            ahsId: null,
          },
        });
        onUpdate?.(updatedListing);
      }

      toast({
        title: ahsId
          ? "Listing linked successfully"
          : "Listing unlinked successfully",
      });
    } catch (error) {
      toast({
        title: ahsId ? "Failed to link listing" : "Failed to unlink listing",
        description: getErrorMessage(error),
        variant: "destructive",
      });
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
      const updatedListing = await updateListingMutation({
        id: listing.id,
        data: {
          title: listing.ahsListing?.name ?? undefined,
        },
      });
      if (listing.ahsListing?.name) {
        onNameChange?.(listing.ahsListing.name);
      }
      onUpdate?.(updatedListing);
      toast({
        title: "Name synced successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to sync name",
        description: getErrorMessage(error),
        variant: "destructive",
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
                  className="font-medium text-foreground hover:underline"
                >
                  {listing.ahsListing.name}
                </a>
              </Muted>
              <div className="flex gap-2">
                {listing.title !== listing.ahsListing.name && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={syncName}
                    disabled={isPending}
                    data-testid="sync-ahs-name"
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
                  data-testid="unlink-ahs"
                >
                  {isPending ? "Unlinking..." : "Unlink"}
                </Button>
              </div>
            </div>
            <AhsListingDisplay ahsListing={listing.ahsListing} />
          </CardContent>
        </Card>
      ) : (
        <div>
          <AhsListingSelect
            onSelect={(ahsListing: AhsListing) =>
              updateAhsListing(ahsListing.id, ahsListing)
            }
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
          <div className="text-sm text-muted-foreground">
            <Skeleton className="h-4 w-64" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
