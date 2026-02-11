"use client";

import { useState, useMemo } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { api } from "@/trpc/react";
import type { inferRouterOutputs } from "@trpc/server";
import type { listingRouter } from "@/server/api/routers/listing";
import { toast } from "sonner";
import { useListingsWithDisplayAhs } from "@/hooks/use-display-ahs-listing";

type ListingRouterOutputs = inferRouterOutputs<typeof listingRouter>;
type ListingData = ListingRouterOutputs["list"][number];

interface AddListingsComboboxProps {
  listId: string;
}

export function AddListingsCombobox({ listId }: AddListingsComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const utils = api.useUtils();
  const { data: listings } = api.listing.list.useQuery();
  const displayListings = useListingsWithDisplayAhs(listings);

  const addListingsMutation = api.list.addListings.useMutation({
    onSuccess: () => {
      toast.success("Listing added to list");
      void utils.list.getListings.invalidate({ id: listId });
      setOpen(false);
      setSearchValue("");
    },
  });

  const filteredListings = useMemo(() => {
    return displayListings.filter((listing) => {
      if (!searchValue) return true;
      return listing.title.toLowerCase().includes(searchValue.toLowerCase());
    });
  }, [displayListings, searchValue]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchValue("");
    }
  };

  // Render the list content
  const renderContent = () => (
    <Command shouldFilter={false} className="flex h-full flex-col">
      <CommandInput
        placeholder="Search your listings..."
        value={searchValue}
        onValueChange={setSearchValue}
        autoFocus={true}
        className="border-none pl-3 focus:ring-0"
        data-testid="add-listings-search-input"
      />
      <CommandList className="flex-1 overflow-x-hidden overflow-y-auto pb-2">
        {displayListings.length === 0 && (
          <CommandEmpty>
            <p className="text-muted-foreground p-2 text-sm">
              No listings found.
            </p>
          </CommandEmpty>
        )}
        <CommandGroup>
          {filteredListings?.map((listing: ListingData) => (
            <CommandItem
              key={listing.id}
              onSelect={() => {
                addListingsMutation.mutate({
                  listId,
                  listingIds: [listing.id],
                });
              }}
              className="px-6"
              disabled={addListingsMutation.isPending}
            >
              <div className="flex w-full items-center justify-between">
                <span>{listing.title}</span>
                {(listing.ahsListing?.hybridizer ??
                  listing.ahsListing?.year) && (
                  <span className="text-muted-foreground text-xs">
                    (
                    {listing.ahsListing.hybridizer && listing.ahsListing.year
                      ? `${listing.ahsListing.hybridizer}, ${listing.ahsListing.year}`
                      : (listing.ahsListing.hybridizer ??
                        listing.ahsListing.year)}
                    )
                  </span>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  // Trigger button
  const triggerButton = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className="w-full justify-between"
      disabled={addListingsMutation.isPending}
      data-testid="add-listings-trigger"
    >
      Search your listings...
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  // Always use Dialog
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent>
        <div className="flex h-full flex-col overflow-hidden">
          <DialogHeader className="shrink-0 px-4 pt-4 pb-2">
            <DialogTitle>Add Listings to List</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">{renderContent()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
