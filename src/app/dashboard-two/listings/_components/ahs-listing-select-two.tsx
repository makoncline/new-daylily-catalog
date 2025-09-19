"use client";

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
import type { RouterOutputs } from "@/trpc/react";

type AhsSearchRow = RouterOutputs["dashboardTwo"]["searchAhs"][number];

interface AhsListingSelectTwoProps {
  onSelect: (row: AhsSearchRow) => void;
  disabled?: boolean;
}

export function AhsListingSelectTwo({
  onSelect,
  disabled,
}: AhsListingSelectTwoProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchValue(searchValue), 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchValue("");
      setDebouncedSearchValue("");
    }
  };

  const minLen = 3;
  const enabled = debouncedSearchValue.trim().length >= minLen;
  const ahsSearchQuery = api.dashboardTwo.searchAhs.useQuery(
    { query: debouncedSearchValue },
    { enabled },
  );

  const handleSelect = (r: AhsSearchRow) => {
    onSelect(r);
    setOpen(false);
  };

  const renderSearchContent = () => (
    <Command shouldFilter={false} className="flex h-full flex-col">
      <CommandInput
        placeholder="Search AHS listings..."
        value={searchValue}
        onValueChange={setSearchValue}
        autoFocus
        className="border-none pl-3 focus:ring-0"
      />
      <CommandList className="flex-1 overflow-x-hidden overflow-y-auto pb-2">
        {!searchValue && (
          <CommandEmpty>Type at least {minLen} characters…</CommandEmpty>
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
          (ahsSearchQuery.error ? (
            <CommandEmpty>Search failed — try again.</CommandEmpty>
          ) : ahsSearchQuery.data?.length === 0 ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : null)}
        {debouncedSearchValue === searchValue &&
          !ahsSearchQuery.isLoading &&
          ahsSearchQuery.data &&
          ahsSearchQuery.data.length > 0 && (
            <CommandGroup>
              {ahsSearchQuery.data.map((r) => (
                <CommandItem
                  key={r.id}
                  onSelect={() => handleSelect(r)}
                  className="px-6"
                >
                  {r.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
      </CommandList>
    </Command>
  );

  const triggerButton = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      aria-label="Select AHS listing"
      className="w-full justify-between"
      disabled={disabled}
      id="ahs-listing-select"
    >
      Select Daylily Database listing...
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

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
