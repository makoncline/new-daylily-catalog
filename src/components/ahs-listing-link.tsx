import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { updateListing } from "@/server/actions/listing";
import { LISTING_CONFIG } from "@/config/constants";

import type { ListingGetOutput } from "@/server/api/routers/listing";
import type { AhsListing } from "@prisma/client";

interface AhsListingLinkProps {
  listing: ListingGetOutput;
  onUpdate?: () => void;
  onNameChange?: (name: string) => void;
}

export function AhsListingLink({
  listing,
  onUpdate,
  onNameChange,
}: AhsListingLinkProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const ahsSearchQuery = api.ahs.search.useQuery(
    { query: searchValue },
    {
      enabled: searchValue.length > 0,
    },
  );

  async function updateAhsListing(
    ahsId: string | null,
    ahsListing?: AhsListing,
  ) {
    setIsPending(true);
    try {
      if (ahsId && ahsListing?.name) {
        // When linking, update both ahsId and name if needed
        const shouldUpdateName =
          !listing.name || listing.name === LISTING_CONFIG.DEFAULT_NAME;
        const name = shouldUpdateName
          ? ahsListing.name
          : (listing.name ?? LISTING_CONFIG.DEFAULT_NAME);

        await updateListing(listing.id, {
          ahsId,
          name,
        });

        // Notify parent about name change
        if (shouldUpdateName) {
          onNameChange?.(ahsListing.name);
        }
      } else {
        // When unlinking, only update ahsId
        await updateListing(listing.id, {
          ahsId: null,
          name: listing.name ?? LISTING_CONFIG.DEFAULT_NAME,
        });
      }

      toast({
        title: ahsId
          ? "AHS listing linked successfully"
          : "AHS listing unlinked successfully",
      });
      onUpdate?.();
    } catch {
      toast({
        title: ahsId
          ? "Failed to link AHS listing"
          : "Failed to unlink AHS listing",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="font-medium">AHS Listing</div>
      {listing.ahsId && listing.ahsListing?.name ? (
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{listing.ahsListing.name}</h3>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const ahsName = listing.ahsListing?.name;
                  if (!listing.ahsId || !ahsName) return;

                  setIsPending(true);
                  try {
                    await updateListing(listing.id, {
                      ahsId: listing.ahsId,
                      name: ahsName,
                    });
                    onNameChange?.(ahsName);
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
                }}
                disabled={isPending}
              >
                {isPending ? "Syncing..." : "Sync Name"}
              </Button>
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
          {/* Add more AHS listing details here if needed */}
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              Select AHS listing...
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <div className="border-none p-0">
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Search AHS listings..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </div>
              <div className="max-h-96 overflow-y-auto">
                {!searchValue && (
                  <p className="p-4 text-sm text-muted-foreground">
                    Type to search AHS listings...
                  </p>
                )}
                {searchValue && ahsSearchQuery.isLoading && (
                  <p className="p-4 text-sm text-muted-foreground">
                    Loading...
                  </p>
                )}
                {searchValue &&
                  !ahsSearchQuery.isLoading &&
                  ahsSearchQuery.data?.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground">
                      No AHS listings found.
                    </p>
                  )}
                {ahsSearchQuery.data?.map((ahsListing) => (
                  <button
                    key={ahsListing.id}
                    onClick={async () => {
                      setOpen(false);
                      await updateAhsListing(ahsListing.id, ahsListing);
                    }}
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      listing.ahsId === ahsListing.id &&
                        "bg-accent text-accent-foreground",
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        listing.ahsId === ahsListing.id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <span>{ahsListing.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
      <p className="text-sm text-muted-foreground">
        Link this listing to an AHS listing. The name will be automatically
        synced if it hasn&apos;t been customized.
      </p>
    </div>
  );
}
