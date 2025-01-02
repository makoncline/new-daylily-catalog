import { useState } from "react";
import { ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/trpc/react";
import type { AhsListing } from "@prisma/client";

interface AhsListingSelectProps {
  onSelect: (ahsListing: AhsListing) => void;
  disabled?: boolean;
}

export function AhsListingSelect({
  onSelect,
  disabled,
}: AhsListingSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const ahsSearchQuery = api.ahs.search.useQuery(
    { query: searchValue },
    {
      enabled: searchValue.length > 0,
    },
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
          id="ahs-listing-select"
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
              <p className="p-4 text-sm text-muted-foreground">Loading...</p>
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
                onClick={() => {
                  setOpen(false);
                  onSelect(ahsListing);
                }}
                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              >
                <span>{ahsListing.name}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
