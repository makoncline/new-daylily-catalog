"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface AhsSearchResult {
  id: string;
  name: string | null;
  cultivarReferenceId: string | null;
}

interface OnboardingAhsListingSelectProps {
  onSelect: (result: AhsSearchResult) => void;
  selectedLabel?: string | null;
  predefinedOptions: AhsSearchResult[];
  isPredefinedOptionsLoading: boolean;
  limitedSearchMessage: string;
  disabled?: boolean;
}

export function OnboardingAhsListingSelect({
  onSelect,
  selectedLabel,
  predefinedOptions,
  isPredefinedOptionsLoading,
  limitedSearchMessage,
  disabled,
}: OnboardingAhsListingSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const normalizedSearchValue = searchValue.trim().toLowerCase();

  const visibleOptions = useMemo(() => {
    if (!normalizedSearchValue) {
      return predefinedOptions;
    }

    return predefinedOptions.filter((option) =>
      (option.name ?? "").toLowerCase().includes(normalizedSearchValue),
    );
  }, [normalizedSearchValue, predefinedOptions]);

  const hasSelection = Boolean(selectedLabel?.trim());
  const triggerText = hasSelection
    ? (selectedLabel?.trim() ?? "")
    : "Select a starter variety...";

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setSearchValue("");
        }
      }}
    >
      <DialogTrigger asChild>
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
      </DialogTrigger>
      <DialogContent>
        <div className="flex h-full flex-col overflow-hidden">
          <DialogHeader className="shrink-0 px-4 pt-4 pb-2">
            <DialogTitle>Select Daylily Variety</DialogTitle>
          </DialogHeader>
          <Command shouldFilter={false} className="flex h-full flex-col">
            <CommandInput
              placeholder="Search onboarding varieties..."
              value={searchValue}
              onValueChange={setSearchValue}
              autoFocus={true}
              className="border-none pl-3 focus:ring-0"
            />
            <CommandList className="flex-1 overflow-x-hidden overflow-y-auto pb-2">
              {!searchValue && isPredefinedOptionsLoading ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground text-sm">Loading...</p>
                </div>
              ) : null}
              {!searchValue && !isPredefinedOptionsLoading ? (
                <div className="text-muted-foreground px-3 py-2 text-xs">
                  Popular varieties are preloaded for onboarding. You can search
                  the full AHS list from your dashboard later.
                </div>
              ) : null}
              {!isPredefinedOptionsLoading && visibleOptions.length === 0 ? (
                <CommandEmpty>
                  {searchValue
                    ? limitedSearchMessage
                    : "No onboarding varieties are available right now."}
                </CommandEmpty>
              ) : null}
              {visibleOptions.length > 0 ? (
                <CommandGroup
                  heading={
                    !searchValue ? "Popular during onboarding" : undefined
                  }
                >
                  {visibleOptions.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => {
                        onSelect(result);
                        setOpen(false);
                      }}
                      className="px-6"
                    >
                      {result.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </div>
      </DialogContent>
    </Dialog>
  );
}
