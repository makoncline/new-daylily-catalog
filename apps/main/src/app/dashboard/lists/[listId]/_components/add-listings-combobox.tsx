"use client";

import { useState, useMemo, useRef } from "react";
import { Search } from "lucide-react";
import { useListResource } from "@/app/dashboard/_lib/dashboard-db/use-list-resource";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  listingsCollection,
  type ListingCollectionItem,
} from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { addListingToList } from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { DASHBOARD_DB_QUERY_KEYS } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-keys";
import { useSeededDashboardDbQuery } from "@/app/dashboard/_lib/dashboard-db/use-seeded-dashboard-db-query";

interface AddListingsComboboxProps {
  listId: string;
  onMutationSuccess?: () => void;
}

export function AddListingsCombobox({
  listId,
  onMutationSuccess,
}: AddListingsComboboxProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const { list } = useListResource(listId);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: listings = [], isReady } =
    useSeededDashboardDbQuery<ListingCollectionItem>({
      query: (q) =>
        q
          .from({ listing: listingsCollection })
          .orderBy(({ listing }) => listing.title, "asc"),
      queryKey: DASHBOARD_DB_QUERY_KEYS.listings,
    });

  const handleSelect = async (listingId: string) => {
    if (isSaving) return;

    setIsSaving(true);
    // Close immediately so the next interaction isn't blocked by the dialog focus trap.
    setOpen(false);
    setSearchValue("");

    try {
      await addListingToList({ listId, listingId });
      toast.success("Listing added to list");
      onMutationSuccess?.();
    } catch {
      toast.error("Failed to add listing to list");
    } finally {
      setIsSaving(false);
      requestAnimationFrame(() =>
        triggerRef.current?.focus({ preventScroll: true }),
      );
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      if (list?.listings.some(({ id }) => id === listing.id)) return false;
      if (!searchValue) return true;
      return listing.title.toLowerCase().includes(searchValue.toLowerCase());
    });
  }, [list, listings, searchValue]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchValue("");
    }
  };

  const triggerButton = (
    <Button
      variant="outline"
      ref={triggerRef}
      className="w-full"
      disabled={isSaving || !isReady}
      data-testid="add-listings-trigger"
    >
      {isSaving ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <Search data-icon="inline-start" />
      )}
      Search your listings…
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent
        className="h-auto"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus({ preventScroll: true });
        }}
      >
        <DialogHeader>
          <DialogTitle>Add Listings to List</DialogTitle>
          <DialogDescription>
            Search your listings and select one to add it to this list.
          </DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search your listings…"
            value={searchValue}
            onValueChange={setSearchValue}
            data-testid="add-listings-search-input"
          />
          <CommandList id="add-listings-list">
            <CommandEmpty>
              No listings found. Only listings outside this list are shown.
            </CommandEmpty>
            <CommandGroup>
              {filteredListings.map((listing) => (
                <CommandItem
                  key={listing.id}
                  value={listing.id}
                  onSelect={() => void handleSelect(listing.id)}
                  disabled={isSaving}
                >
                  {listing.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
