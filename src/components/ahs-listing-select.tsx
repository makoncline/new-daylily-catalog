"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronsUpDown } from "lucide-react";
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
import { cn } from "@/lib/utils";

export interface AhsSearchResult {
  id: string;
  name: string | null;
  cultivarReferenceId: string | null;
}

interface AhsListingSelectProps {
  onSelect: (result: AhsSearchResult) => void;
  disabled?: boolean;
  selectedLabel?: string | null;
}

export function AhsListingSelect({
  onSelect,
  disabled,
  selectedLabel,
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

  // Clear search when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchValue("");
      setDebouncedSearchValue("");
    }
  };

  const ahsSearchQuery = api.dashboardDb.ahs.search.useQuery(
    {
      query: debouncedSearchValue,
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

  const hasSelection = Boolean(selectedLabel?.trim());
  const triggerText = hasSelection
    ? (selectedLabel?.trim() ?? "")
    : "Select Daylily Database listing...";

  // Trigger button
  const triggerButton = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={cn(
        "w-full justify-between",
        hasSelection && "border-emerald-500/50 bg-emerald-500/5",
      )}
      disabled={disabled}
      id="ahs-listing-select"
    >
      <span className="truncate">{triggerText}</span>
      <span className="ml-2 inline-flex items-center gap-1.5">
        {hasSelection ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        ) : null}
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </span>
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
