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
import { toast } from "sonner";
import { useLiveQuery } from "@tanstack/react-db";
import { listingsCollection } from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { addListingToList } from "@/app/dashboard/_lib/dashboard-db/lists-collection";

interface AddListingsComboboxProps {
  listId: string;
}

export function AddListingsCombobox({ listId }: AddListingsComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isPending, setIsPending] = useState(false);

  const { data: listings = [] } = useLiveQuery((q) =>
    q
      .from({ listing: listingsCollection })
      .orderBy(({ listing }) => listing.title, "asc"),
  );

  const handleSelect = async (listingId: string) => {
    if (isPending) return;

    setIsPending(true);
    // Close immediately so the next interaction isn't blocked by the dialog focus trap.
    setOpen(false);
    setSearchValue("");

    try {
      await addListingToList({ listId, listingId });
      toast.success("Listing added to list");
    } catch {
      toast.error("Failed to add listing to list");
    } finally {
      setIsPending(false);
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      if (!searchValue) return true;
      return listing.title.toLowerCase().includes(searchValue.toLowerCase());
    });
  }, [listings, searchValue]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchValue("");
    }
  };

  const triggerButton = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className="w-full justify-between"
      disabled={isPending}
      data-testid="add-listings-trigger"
    >
      Search your listings...
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent
        onCloseAutoFocus={(event) => {
          // Don't restore focus to the trigger on close.
          event.preventDefault();
        }}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <DialogHeader className="shrink-0 px-4 pt-4 pb-2">
            <DialogTitle>Add Listings to List</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <Command shouldFilter={false} className="flex h-full flex-col">
              <CommandInput
                placeholder="Search your listings..."
                value={searchValue}
                onValueChange={setSearchValue}
                autoFocus
                className="border-none pl-3 focus:ring-0"
                data-testid="add-listings-search-input"
              />
              <CommandList className="flex-1 overflow-x-hidden overflow-y-auto pb-2">
                {listings.length === 0 && (
                  <CommandEmpty>
                    <p className="text-muted-foreground p-2 text-sm">
                      No listings found.
                    </p>
                  </CommandEmpty>
                )}
                <CommandGroup>
                  {filteredListings?.map((listing) => (
                    <CommandItem
                      key={listing.id}
                      onSelect={() => void handleSelect(listing.id)}
                      className="px-6"
                      disabled={isPending}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span>{listing.title}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
