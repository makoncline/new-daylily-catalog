import { useEffect, useState } from "react";
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
import { useCultivarReferenceLinkingEnabled } from "@/hooks/use-cultivar-reference-linking-enabled";

export interface AhsSearchResult {
  id: string;
  name: string | null;
  cultivarReferenceId: string | null;
}

interface AhsListingSelectProps {
  onSelect: (result: AhsSearchResult) => void;
  disabled?: boolean;
}

export function AhsListingSelect({
  onSelect,
  disabled,
}: AhsListingSelectProps) {
  const useCultivarReferenceSearch = useCultivarReferenceLinkingEnabled();
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

  // Clear search when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchValue("");
      setDebouncedSearchValue("");
    }
  };

  const ahsSearchQuery = api.ahs.search.useQuery(
    {
      query: debouncedSearchValue,
      useCultivarReferenceSearch,
    },
    {
      enabled: debouncedSearchValue.length > 0,
    },
  );

  // Handler for selecting an item
  const handleSelect = (result: AhsSearchResult) => {
    onSelect(result);
    setOpen(false);
  };

  // Render the search content
  const renderSearchContent = () => (
    <Command shouldFilter={false} className="flex h-full flex-col">
      <CommandInput
        placeholder="Search AHS listings..."
        value={searchValue}
        onValueChange={setSearchValue}
        autoFocus={true}
        className="border-none pl-3 focus:ring-0"
      />
      <CommandList className="flex-1 overflow-x-hidden overflow-y-auto pb-2">
        {!searchValue && (
          <CommandEmpty>Type to search AHS listings...</CommandEmpty>
        )}
        {searchValue &&
          (debouncedSearchValue !== searchValue ||
            ahsSearchQuery.isLoading) && (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground text-sm">Loading...</p>
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
              {ahsSearchQuery.data.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => handleSelect(result)}
                  className="px-6"
                >
                  {result.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
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
      disabled={disabled}
      id="ahs-listing-select"
    >
      Select Daylily Database listing...
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
            <DialogTitle>Select Daylily Database Listing</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">{renderSearchContent()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
