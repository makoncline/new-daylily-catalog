"use client";

import * as React from "react";
import { type Column, type Table } from "@tanstack/react-table";
import { Check, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { TruncatedListBadge } from "./truncated-list-badge";

interface DataTableFacetedFilterProps<TData> {
  column?: Column<TData>;
  title?: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  table: Table<TData>;
}

export function DataTableFacetedFilter<TData>({
  column,
  title,
  options,
  table,
}: DataTableFacetedFilterProps<TData>) {
  const selectedValues = new Set(column?.getFilterValue() as string[]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <TruncatedListBadge
                        key={option.value}
                        name={option.label}
                        className="rounded-sm px-1 font-normal"
                      />
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      // Get current filter state
                      const currentFilters = table.getState().columnFilters;

                      // Update selected values
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      const filterValues = Array.from(selectedValues);

                      // Update column filters while preserving others
                      const otherFilters = currentFilters.filter(
                        (f) => f.id !== column?.id,
                      );
                      const newColumnFilters = [
                        ...otherFilters,
                        ...(filterValues.length
                          ? [{ id: column?.id ?? "", value: filterValues }]
                          : []),
                      ];

                      // Update state while preserving everything except what we're explicitly changing
                      table.setState((old) => ({
                        ...old,
                        columnFilters: newColumnFilters,
                        pagination: {
                          ...old.pagination,
                          pageIndex: 0,
                        },
                      }));
                    }}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check className={cn("h-4 w-4")} />
                    </div>
                    {option.icon && (
                      <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      // Get current filter state
                      const currentFilters = table.getState().columnFilters;

                      // Update column filters while preserving others
                      const newColumnFilters = currentFilters.filter(
                        (f) => f.id !== column?.id,
                      );

                      // Update state while preserving everything except what we're explicitly changing
                      table.setState((old) => ({
                        ...old,
                        columnFilters: newColumnFilters,
                        pagination: {
                          ...old.pagination,
                          pageIndex: 0,
                        },
                      }));
                    }}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
