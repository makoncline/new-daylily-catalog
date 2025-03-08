import { useEffect, useState } from "react";
import { ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  // Debounce search value to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Clear search when popover closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchValue("");
      setDebouncedSearchValue("");
    }
  };

  const ahsSearchQuery = api.ahs.search.useQuery(
    { query: debouncedSearchValue },
    {
      enabled: debouncedSearchValue.length > 0,
    },
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
          id="ahs-listing-select"
        >
          Select Daylily Database listing...
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search AHS listings..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="h-[200px]">
            {!searchValue && (
              <CommandEmpty>Type to search AHS listings...</CommandEmpty>
            )}
            {searchValue &&
              (debouncedSearchValue !== searchValue ||
                ahsSearchQuery.isLoading) && (
                <div className="flex h-[200px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              )}
            {searchValue &&
              debouncedSearchValue === searchValue &&
              !ahsSearchQuery.isLoading &&
              ahsSearchQuery.data?.length === 0 && (
                <CommandEmpty>
                  No results found. Try searching for something else.
                </CommandEmpty>
              )}
            {debouncedSearchValue === searchValue &&
              !ahsSearchQuery.isLoading &&
              ahsSearchQuery.data &&
              ahsSearchQuery.data.length > 0 && (
                <CommandGroup>
                  {ahsSearchQuery.data.map((ahsListing) => (
                    <CommandItem
                      key={ahsListing.id}
                      onSelect={() => {
                        onSelect(ahsListing);
                        setOpen(false);
                      }}
                    >
                      {ahsListing.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
