import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { LISTING_CONFIG } from "@/config/constants";

import type { ListingGetOutput } from "@/server/api/routers/listing";
import type { AhsListing } from "@prisma/client";
import { AhsListingSelect } from "./ahs-listing-select";

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
      onError: () => {
        toast({
          title: "Failed to save changes",
          variant: "destructive",
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
          !listing.name || listing.name === LISTING_CONFIG.DEFAULT_NAME;

        const data: { ahsId: string; name?: string } = {
          ahsId,
        };

        if (shouldUpdateName) {
          data.name = ahsListing.name;
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
    } catch {
      toast({
        title: ahsId ? "Failed to link listing" : "Failed to unlink listing",
        variant: "destructive",
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
          name: listing.ahsListing?.name || undefined,
        },
      });
      if (listing.ahsListing?.name) {
        onNameChange?.(listing.ahsListing.name);
      }
      onUpdate?.(updatedListing);
      toast({
        title: "Name synced successfully",
      });
    } catch {
      toast({
        title: "Failed to sync name",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      {listing.ahsListing ? (
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{listing.ahsListing.name}</h3>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateAhsListing(null, null)}
                disabled={isPending}
              >
                {isPending ? "Unlinking..." : "Unlink"}
              </Button>
              {listing.name !== listing.ahsListing.name && (
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
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Linked to{" "}
            <a
              href={`https://daylilies.org/daylilies/${listing.ahsListing.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              {listing.ahsListing.name}
            </a>
          </div>
        </div>
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
