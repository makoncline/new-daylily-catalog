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
  table?: Table<TData>;
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  buttonClassName?: string;
}

export function DataTableFacetedFilter<TData>({
  column,
  title,
  options,
  table,
  values,
  onValuesChange,
  buttonClassName,
}: DataTableFacetedFilterProps<TData>) {
  const rawFilterValue = column?.getFilterValue();
  const columnValues: string[] = Array.isArray(rawFilterValue)
    ? rawFilterValue.map(String)
    : typeof rawFilterValue === "string"
      ? [rawFilterValue]
      : typeof rawFilterValue === "number" ||
          typeof rawFilterValue === "boolean"
        ? [String(rawFilterValue)]
        : [];
  const selectedValues = new Set<string>(values ?? columnValues);

  const commitValues = (nextValues: string[]) => {
    column?.setFilterValue(nextValues.length ? nextValues : undefined);
    onValuesChange?.(nextValues);
    table?.resetPagination();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 border-dashed", buttonClassName)}
        >
          <PlusCircle className="mr-2 size-4" />
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
              <div className="hidden gap-x-1 lg:flex">
                {selectedValues.size === 1 ? (
                  options.flatMap((option) =>
                    selectedValues.has(option.value)
                      ? [
                          <TruncatedListBadge
                            key={option.value}
                            name={option.label}
                            className="rounded-sm px-1 font-normal"
                          />,
                        ]
                      : [],
                  )
                ) : (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.size} selected
                  </Badge>
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
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      commitValues(Array.from(selectedValues));
                    }}
                  >
                    <div
                      className={cn(
                        "border-primary mr-2 flex size-4 items-center justify-center rounded-sm border",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check className={cn("size-4")} />
                    </div>
                    {option.icon && (
                      <option.icon className="text-muted-foreground mr-2 size-4" />
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
                      commitValues([]);
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
