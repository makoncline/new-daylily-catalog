"use client";

import { useEffect, useMemo, useState } from "react";
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
  predefinedOptions?: AhsSearchResult[];
  limitToPredefinedOptions?: boolean;
  isPredefinedOptionsLoading?: boolean;
  limitedSearchMessage?: string;
  searchPlaceholder?: string;
  triggerPlaceholder?: string;
  dialogTitle?: string;
}

export function AhsListingSelect({
  onSelect,
  disabled,
  selectedLabel,
  predefinedOptions = [],
  limitToPredefinedOptions = false,
  isPredefinedOptionsLoading = false,
  limitedSearchMessage = "Only a limited set of varieties is available during onboarding. You can search the full list from your dashboard.",
  searchPlaceholder = "Search AHS listings...",
  triggerPlaceholder = "Select Daylily Database listing...",
  dialogTitle = "Select Daylily Database Listing",
}: AhsListingSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  const normalizedSearchValue = searchValue.trim().toLowerCase();
  const usesPredefinedOptions = limitToPredefinedOptions;

  // Debounce search value to prevent excessive API calls
  useEffect(() => {
    if (usesPredefinedOptions) {
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, usesPredefinedOptions]);

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
      enabled: !usesPredefinedOptions && debouncedSearchValue.length > 0,
    },
  );

  const filteredPredefinedOptions = useMemo(() => {
    if (!usesPredefinedOptions) {
      return [];
    }

    if (!normalizedSearchValue) {
      return predefinedOptions;
    }

    return predefinedOptions.filter((option) =>
      (option.name ?? "").toLowerCase().includes(normalizedSearchValue),
    );
  }, [normalizedSearchValue, predefinedOptions, usesPredefinedOptions]);

  const shouldShowLoading =
    !usesPredefinedOptions &&
    searchValue.length > 0 &&
    (debouncedSearchValue !== searchValue || ahsSearchQuery.isLoading);

  const visibleOptions = usesPredefinedOptions
    ? filteredPredefinedOptions
    : (ahsSearchQuery.data ?? []);

  // Handler for selecting an item
  const handleSelect = (result: AhsSearchResult) => {
    onSelect(result);
    setOpen(false);
  };

  // Render the search content
  const renderSearchContent = () => (
    <Command shouldFilter={false} className="flex h-full flex-col">
      <CommandInput
        placeholder={searchPlaceholder}
        value={searchValue}
        onValueChange={setSearchValue}
        autoFocus={true}
        className="border-none pl-3 focus:ring-0"
      />
      <CommandList className="flex-1 overflow-x-hidden overflow-y-auto pb-2">
        {!searchValue && !usesPredefinedOptions && (
          <CommandEmpty>Type to search AHS listings...</CommandEmpty>
        )}
        {!searchValue &&
          usesPredefinedOptions &&
          isPredefinedOptionsLoading && (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
          )}
        {!searchValue &&
          usesPredefinedOptions &&
          !isPredefinedOptionsLoading &&
          predefinedOptions.length === 0 && (
            <CommandEmpty>
              No onboarding varieties are available right now.
            </CommandEmpty>
          )}
        {!searchValue &&
          usesPredefinedOptions &&
          predefinedOptions.length > 0 && (
            <div className="text-muted-foreground px-3 py-2 text-xs">
              Popular varieties are preloaded for onboarding. You can change
              this later in your dashboard.
            </div>
          )}
        {shouldShowLoading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        )}
        {searchValue && !shouldShowLoading && visibleOptions.length === 0 && (
          <CommandEmpty>
            {usesPredefinedOptions
              ? limitedSearchMessage
              : "No results found. Try searching for something else."}
          </CommandEmpty>
        )}
        {!shouldShowLoading && visibleOptions.length > 0 && (
          <CommandGroup
            heading={
              !searchValue && usesPredefinedOptions
                ? "Popular during onboarding"
                : undefined
            }
          >
            {visibleOptions.map((result) => (
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
    : triggerPlaceholder;

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
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">{renderSearchContent()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
