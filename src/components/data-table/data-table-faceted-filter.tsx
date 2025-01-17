"use client";

import * as React from "react";
import { type Column } from "@tanstack/react-table";
import { Check, PlusCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const facets = column?.getFacetedUniqueValues();

  // Initialize filter state from URL
  React.useEffect(() => {
    const listsParam = searchParams.get("lists");
    const filterValues = listsParam ? listsParam.split(",") : [];
    column?.setFilterValue(filterValues.length ? filterValues : undefined);
  }, [searchParams, column]);

  const selectedValues = new Set(column?.getFilterValue() as string[]);

  const createQueryString = React.useCallback(
    (params: { name: string; value: string | null }) => {
      const newSearchParams = new URLSearchParams(searchParams?.toString());

      if (params.value === null) {
        newSearchParams.delete(params.name);
      } else {
        newSearchParams.set(params.name, params.value);
      }

      return newSearchParams.toString();
    },
    [searchParams],
  );

  const updateUrl = React.useCallback(
    (filterValues: string[] | undefined) => {
      const queryString = filterValues?.length
        ? createQueryString({
            name: "lists",
            value: filterValues.join(","),
          })
        : createQueryString({ name: "lists", value: null });

      router.push(pathname + (queryString ? `?${queryString}` : ""), {
        scroll: false,
      });
    },
    [createQueryString, pathname, router],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed hover:bg-muted/50"
        >
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
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      const filterValues = Array.from(selectedValues);
                      column?.setFilterValue(
                        filterValues.length ? filterValues : undefined,
                      );
                      updateUrl(filterValues.length ? filterValues : undefined);
                    }}
                    className="hover:bg-muted/50"
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
                    {facets?.get(option.value) && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                        {facets.get(option.value)}
                      </span>
                    )}
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
                      column?.setFilterValue(undefined);
                      updateUrl(undefined);
                    }}
                    className="justify-center text-center hover:bg-muted/50"
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
