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
import { cn } from "@/lib/utils";
import { TruncatedListBadge } from "@/components/data-table/truncated-list-badge";
import { Muted } from "@/components/typography";
import type { DbList } from "./types";

export function MultiListSelectTwo({
  lists,
  values,
  onSelect,
  onCreateList,
  disabled,
}: {
  lists: Pick<DbList, "id" | "title">[];
  values: string[];
  onSelect: (listIds: string[]) => void;
  onCreateList: (title: string) => Promise<{ id: string; title: string }>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredLists = lists.filter((l) =>
    l.title.toLowerCase().includes(searchValue.toLowerCase()),
  );
  const selectedLists = lists.filter((l) => values.includes(l.id));

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setSearchValue("");
  };
  const handleToggleList = (listId: string) => {
    const next = values.includes(listId)
      ? values.filter((id) => id !== listId)
      : [...values, listId];
    onSelect(next);
  };
  const handleClearAll = () => {
    onSelect([]);
    setOpen(false);
  };
  const handleCreate = async () => {
    if (!searchValue) return;
    const exists = lists.some(
      (l) => l.title.trim().toLowerCase() === searchValue.trim().toLowerCase(),
    );
    if (exists) {
      onSelect([
        ...values,
        ...lists
          .filter(
            (l) =>
              l.title.trim().toLowerCase() === searchValue.trim().toLowerCase(),
          )
          .map((l) => l.id),
      ]);
      setOpen(false);
      setSearchValue("");
      return;
    }
    const created = await onCreateList(searchValue);
    onSelect([...values, created.id]);
    setOpen(false);
    setSearchValue("");
  };

  const trigger = (
    <Button
      id="list-select"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      aria-label="Select lists"
      className="w-full justify-between"
      disabled={disabled}
    >
      <div className="flex flex-wrap gap-1 truncate">
        {selectedLists.length
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <div className="flex h-full flex-col overflow-hidden">
          <DialogHeader className="shrink-0 px-4 pt-4 pb-2">
            <DialogTitle>Select Lists</DialogTitle>
          </DialogHeader>
          <Command shouldFilter={false} className="flex h-full flex-col">
            <CommandInput
              placeholder="Search lists..."
              value={searchValue}
              onValueChange={setSearchValue}
              autoFocus
              className="border-none pl-3 focus:ring-0"
            />
            <CommandList className="flex-1 overflow-x-hidden overflow-y-auto pb-2">
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
              {!lists.length && (
                <CommandEmpty>
                  <Muted className="p-2 text-sm">
                    No lists found. Create a list first.
                  </Muted>
                </CommandEmpty>
              )}
              {filteredLists.length === 0 && searchValue && (
                <CommandItem
                  onSelect={handleCreate}
                  className="flex items-center px-2 py-1.5"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Create &quot;{searchValue}&quot;</span>
                </CommandItem>
              )}
              <CommandGroup>
                {filteredLists.map((list) => (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MultiListSelectTwoSkeleton() {
  return (
    <div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
