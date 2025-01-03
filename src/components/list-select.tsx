import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

interface ListSelectProps {
  value?: string | null;
  onSelect: (listId: string | null) => void;
  disabled?: boolean;
}

export function ListSelect({ value, onSelect, disabled }: ListSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const utils = api.useUtils();
  const { data: lists } = api.listing.getUserLists.useQuery();
  const createListMutation = api.listing.createList.useMutation({
    onSuccess: (newList) => {
      onSelect(newList.id);
      setOpen(false);
      setSearchValue("");
      void utils.listing.getUserLists.invalidate();
    },
  });

  const filteredLists = lists?.filter((list) =>
    list.name.toLowerCase().includes(searchValue.toLowerCase()),
  );

  const selectedList = lists?.find((list) => list.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="list-select"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedList ? selectedList.name : "Select list..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <div className="border-none p-0">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search lists..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!searchValue && (
              <Button
                variant="ghost"
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                }}
                className="relative w-full justify-start px-2 py-1.5 font-normal"
              >
                <X className="mr-2 h-4 w-4" />
                <span>None</span>
              </Button>
            )}
            {lists?.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                No lists found. Type to create one.
              </p>
            )}
            {filteredLists?.length === 0 && searchValue && (
              <Button
                variant="ghost"
                onClick={() => {
                  createListMutation.mutate({ name: searchValue });
                }}
                className="relative w-full justify-start px-2 py-1.5 font-normal"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>Create &quot;{searchValue}&quot;</span>
              </Button>
            )}
            {filteredLists?.map((list) => (
              <Button
                key={list.id}
                variant="ghost"
                onClick={() => {
                  onSelect(list.id === value ? null : list.id);
                  setOpen(false);
                }}
                className="relative w-full justify-start px-2 py-1.5 font-normal"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    list.id === value ? "opacity-100" : "opacity-0",
                  )}
                />
                <span>{list.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ListSelectSkeleton() {
  return (
    <div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
