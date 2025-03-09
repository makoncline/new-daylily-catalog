"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  CommandSeparator,
} from "@/components/ui/command";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { TruncatedListBadge } from "@/components/data-table/truncated-list-badge";
import { Muted } from "@/components/typography";
import { useKeyboardStatus } from "@/hooks/use-keyboard-status";
import { useVisualViewportHeight } from "@/hooks/use-visual-viewport-height";

interface MultiListSelectProps {
  values: string[];
  onSelect: (listIds: string[]) => void;
  disabled?: boolean;
}

export function MultiListSelect({
  values,
  onSelect,
  disabled,
}: MultiListSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const keyboardOpen = useKeyboardStatus();
  const viewportHeight = useVisualViewportHeight();

  const utils = api.useUtils();
  const { data: lists } = api.listing.getUserLists.useQuery();
  const createListMutation = api.listing.createList.useMutation({
    onSuccess: (newList) => {
      onSelect([...values, newList.id]);
      setOpen(false);
      setSearchValue("");
      void utils.listing.getUserLists.invalidate();
    },
  });

  const filteredLists = lists?.filter((list) =>
    list.title.toLowerCase().includes(searchValue.toLowerCase()),
  );

  const selectedLists = lists?.filter((list) => values.includes(list.id));

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchValue("");
    }
  };

  const handleToggleList = (listId: string) => {
    const newValues = values.includes(listId)
      ? values.filter((id) => id !== listId)
      : [...values, listId];
    onSelect(newValues);
  };

  const handleClearAll = () => {
    onSelect([]);
    setOpen(false);
  };

  const handleCreateList = () => {
    if (searchValue) {
      createListMutation.mutate({ title: searchValue });
    }
  };

  // Render the list content
  const renderContent = () => (
    <Command shouldFilter={false} className="flex h-full flex-col">
      <CommandInput
        placeholder="Search lists..."
        value={searchValue}
        onValueChange={setSearchValue}
        autoFocus={true}
        className="border-none pl-3 focus:ring-0"
      />
      <CommandList className="flex-1 overflow-y-auto overflow-x-hidden pb-2">
        {!searchValue && (
          <>
            <CommandItem
              onSelect={handleClearAll}
              className="flex items-center px-2 py-1.5"
            >
              <X className="mr-2 h-4 w-4" />
              <span>None</span>
            </CommandItem>
            <CommandSeparator />
          </>
        )}

        {lists?.length === 0 && (
          <CommandEmpty>
            <Muted className="p-2 text-sm">
              No lists found. Create a list first.
            </Muted>
          </CommandEmpty>
        )}

        {filteredLists?.length === 0 && searchValue && (
          <CommandItem
            onSelect={handleCreateList}
            className="flex items-center px-2 py-1.5"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>Create &quot;{searchValue}&quot;</span>
          </CommandItem>
        )}

        <CommandGroup>
          {filteredLists?.map((list) => (
            <CommandItem
              key={list.id}
              onSelect={() => handleToggleList(list.id)}
              className="px-6"
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  values.includes(list.id) ? "opacity-100" : "opacity-0",
                )}
              />
              <span>{list.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  // Trigger button
  const triggerButton = (
    <Button
      id="list-select"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className="w-full justify-between"
      disabled={disabled}
    >
      <div className="flex flex-wrap gap-1 truncate">
        {selectedLists?.length
          ? selectedLists.map((list) => (
              <TruncatedListBadge
                key={list.id}
                name={list.title}
                className="text-xs font-normal"
              />
            ))
          : "Select lists..."}
      </div>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  // Always use Dialog
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent
        className={cn(
          "overflow-hidden p-0 sm:max-w-md",
          !keyboardOpen && "max-h-[50vh] min-h-[400px]",
        )}
        style={
          keyboardOpen
            ? {
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                height: `${viewportHeight}px`,
                maxHeight: `${viewportHeight}px`,
              }
            : undefined
        }
      >
        <div className="flex h-full flex-col overflow-hidden">
          <DialogHeader className="shrink-0 px-4 pb-2 pt-4">
            <DialogTitle>Select Lists</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">{renderContent()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MultiListSelectSkeleton() {
  return (
    <div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
