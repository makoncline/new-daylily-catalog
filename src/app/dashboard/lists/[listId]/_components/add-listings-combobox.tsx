"use client";

import { useState, useMemo } from "react";
import { ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/trpc/react";
import type { inferRouterOutputs } from "@trpc/server";
import type { listingRouter } from "@/server/api/routers/listing";
import { useToast } from "@/hooks/use-toast";

type ListingRouterOutputs = inferRouterOutputs<typeof listingRouter>;
type ListingData = ListingRouterOutputs["list"][number];

interface AddListingsComboboxProps {
  listId: string;
}

export function AddListingsCombobox({ listId }: AddListingsComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { toast } = useToast();

  const utils = api.useUtils();
  const { data: listings } = api.listing.list.useQuery();

  const addListingsMutation = api.list.addListings.useMutation({
    onSuccess: () => {
      toast({
        title: "Listing added to list",
      });
      void utils.list.getListings.invalidate({ id: listId });
      setOpen(false);
      setSearchValue("");
    },
  });

  const filteredListings = useMemo(() => {
    if (!listings) return [];
    return listings.filter((listing) => {
      if (!searchValue) return true;
      return listing.title.toLowerCase().includes(searchValue.toLowerCase());
    });
  }, [listings, searchValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={addListingsMutation.isPending}
        >
          Search your listings...
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <div className="border-none p-0">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search your listings..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <div className="max-h-96 overflow-y-auto">
            {listings?.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                No listings found.
              </p>
            )}
            {filteredListings?.map((listing: ListingData) => (
              <Button
                key={listing.id}
                variant="ghost"
                onClick={() => {
                  addListingsMutation.mutate({
                    listId,
                    listingIds: [listing.id],
                  });
                }}
                className="relative w-full justify-start px-2 py-1.5 font-normal"
                disabled={addListingsMutation.isPending}
              >
                <div className="flex w-full items-center justify-between">
                  <span>{listing.title}</span>
                  {(listing.ahsListing?.hybridizer ??
                    listing.ahsListing?.year) && (
                    <span className="text-xs text-muted-foreground">
                      (
                      {listing.ahsListing.hybridizer && listing.ahsListing.year
                        ? `${listing.ahsListing.hybridizer}, ${listing.ahsListing.year}`
                        : (listing.ahsListing.hybridizer ??
                          listing.ahsListing.year)}
                      )
                    </span>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
