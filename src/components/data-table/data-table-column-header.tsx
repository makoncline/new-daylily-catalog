"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretSortIcon,
} from "@radix-ui/react-icons";
import { Search } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import React, { useState } from "react";
import { useDebouncedCallback } from "use-debounce";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: React.ReactNode;
  className?: string;
  enableFilter?: boolean;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  enableFilter,
}: DataTableColumnHeaderProps<TData, TValue>) {
  // Local state for immediate input updates
  const [value, setValue] = useState<string>(
    (column.getFilterValue() as string) || "",
  );

  // Debounced function for expensive filtering operations
  const debouncedFiltering = useDebouncedCallback((filterValue: string) => {
    column.setFilterValue(filterValue);
  }, 200);

  // Handle input changes - update UI immediately but debounce filtering
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setValue(newValue);
    debouncedFiltering(newValue);
  };

  if (!column.getCanSort() && !enableFilter) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {column.getCanSort() ? (
        <Button
          variant="ghost"
          size="sm"
          className="data-[state=open]:bg-accent -ml-1 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>{title}</span>
          {column.getIsSorted() === "desc" ? (
            <ArrowDownIcon className="h-4 w-4" />
          ) : column.getIsSorted() === "asc" ? (
            <ArrowUpIcon className="h-4 w-4" />
          ) : (
            <CaretSortIcon className="h-4 w-4" />
          )}
        </Button>
      ) : (
        <div>{title}</div>
      )}

      {enableFilter && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-muted h-8 w-8 p-0"
            >
              <Search className="h-4 w-4" />
              <span className="sr-only">
                Filter {typeof title === "string" ? title.toLowerCase() : ""}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2" align="start">
            <Input
              placeholder={`Filter ${typeof title === "string" ? title.toLowerCase() : ""}...`}
              value={value}
              onChange={handleChange}
              className="h-8"
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
