"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { TruncatedListBadge } from "@/components/data-table/truncated-list-badge";
import { useLiveQuery } from "@tanstack/react-db";
import {
  insertList,
  listsCollection,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { toast } from "sonner";

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
  const [isCreating, setIsCreating] = useState(false);
  const { data: lists = [] } = useLiveQuery((q) =>
    q.from({ list: listsCollection }).orderBy(({ list }) => list.title, "asc"),
  );
  const filteredLists = lists.filter((list) =>
    list.title.toLowerCase().includes(searchValue.toLowerCase()),
  );
  const selectedLists = lists.filter((list) => values.includes(list.id));
  const isBusy = isCreating || disabled === true;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setSearchValue("");
  };
  const handleToggleList = (listId: string) => {
    onSelect(
      values.includes(listId)
        ? values.filter((id) => id !== listId)
        : [...values, listId],
    );
  };
  const handleCreateList = async () => {
    if (!searchValue || isBusy) return;
    setIsCreating(true);
    try {
      const newList = await insertList({ title: searchValue });
      onSelect([...values, newList.id]);
      handleOpenChange(false);
    } catch {
      toast.error("Failed to create list");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          id="list-select"
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls="list-select-list"
          className="w-full justify-between"
          disabled={isBusy}
        >
          <span className="flex min-w-0 gap-1 overflow-hidden">
            {selectedLists.length
              ? selectedLists.map((list) => (
                  <TruncatedListBadge
                    key={list.id}
                    name={list.title}
                    className="shrink-0"
                  />
                ))
              : "Select lists..."}
          </span>
          <ChevronsUpDown aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Lists</DialogTitle>
          <DialogDescription>
            Select one or more lists. You can also create a list.
          </DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search lists..."
            value={searchValue}
            onValueChange={setSearchValue}
            disabled={isCreating}
          />
          <CommandList id="list-select-list">
            {!searchValue && (
              <>
                <CommandGroup>
                  <CommandItem
                    disabled={isBusy}
                    onSelect={() => {
                      onSelect([]);
                      handleOpenChange(false);
                    }}
                  >
                    <X aria-hidden="true" />
                    None
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            {lists.length === 0 && !searchValue && (
              <CommandEmpty>
                No lists found. Search for a name to create a list.
              </CommandEmpty>
            )}
            {filteredLists.length === 0 && searchValue && (
              <CommandGroup>
                <CommandItem
                  disabled={isBusy}
                  onSelect={() => void handleCreateList()}
                >
                  <Plus aria-hidden="true" />
                  Create &quot;{searchValue}&quot;
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {filteredLists.map((list) => (
                <CommandItem
                  key={list.id}
                  disabled={isBusy}
                  onSelect={() => handleToggleList(list.id)}
                >
                  <Check
                    className={cn(
                      values.includes(list.id) ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                  {list.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export function MultiListSelectSkeleton() {
  return <Skeleton className="h-9 w-full" />;
}
