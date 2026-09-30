"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/trpc/react";

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
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

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

  useEffect(() => {
    if (!open) {
      return;
    }

    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [open]);

  const handleSelect = (result: AhsSearchResult) => {
    onSelect(result);
    setOpen(false);
  };

  const renderSearchContent = () => (
    <Command shouldFilter={false} className="flex h-full flex-col">
      <CommandInput
        placeholder="Search AHS listings…"
        ref={searchInputRef}
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList
        id="ahs-listing-select-list"
        className="flex-1 overflow-x-hidden overflow-y-auto"
      >
        {!searchValue && (
          <CommandEmpty>Type to search AHS listings…</CommandEmpty>
        )}
        {searchValue &&
          (debouncedSearchValue !== searchValue ||
            ahsSearchQuery.isLoading) && (
            <div
              role="status"
              className="flex items-center justify-center gap-2 p-6"
            >
              <Spinner aria-hidden="true" />
              Loading…
            </div>
          )}
        {ahsSearchQuery.isError && debouncedSearchValue === searchValue && (
          <Alert variant="destructive">
            <AlertTitle>Search failed</AlertTitle>
            <AlertDescription>Try the search again.</AlertDescription>
            <Button
              type="button"
              variant="outline"
              onClick={() => void ahsSearchQuery.refetch()}
            >
              Retry
            </Button>
          </Alert>
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
                >
                  {result.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
      </CommandList>
    </Command>
  );

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-label="Select Daylily Database listing"
      aria-expanded={open}
      aria-controls="ahs-listing-select-list"
      className="w-full justify-between"
      disabled={disabled}
      id="ahs-listing-select"
    >
      Select Daylily Database listing…
      <ChevronsUpDown aria-hidden="true" />
    </Button>
  );
  const searchContent = renderSearchContent();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Daylily Database Listing</DialogTitle>
          <DialogDescription>
            Search by cultivar name and select the matching database listing to
            link details to this listing.
          </DialogDescription>
        </DialogHeader>
        {searchContent}
      </DialogContent>
    </Dialog>
  );
}
