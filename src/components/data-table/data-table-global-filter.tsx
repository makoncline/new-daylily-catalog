"use client";

import React from "react";
import type { Table } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedCallback } from "use-debounce";

interface DataTableGlobalFilterProps<TData> {
  table: Table<TData>;
  placeholder?: string;
}

export function DataTableGlobalFilterSkeleton() {
  return <Skeleton className="h-8 w-[150px] lg:w-[250px]" />;
}

/**
 * A global filter input for the data table with debounced filtering.
 * Updates the input immediately but debounces the actual filtering operation.
 */
export function DataTableGlobalFilter<TData>({
  table,
  placeholder = "Filter...",
}: DataTableGlobalFilterProps<TData>) {
  // Local state for immediate input updates
  const [value, setValue] = React.useState<string>("");

  // Debounced function for expensive filtering operations
  const debouncedFiltering = useDebouncedCallback((filterValue: string) => {
    table.setGlobalFilter(filterValue);
    // Sort by title when filtering to prioritize title matches
    if (filterValue) {
      table.setSorting([{ id: "title", desc: false }]);
    }
    table.resetPageIndex(true);
  }, 200);

  // Handle input changes - update UI immediately but debounce filtering
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setValue(newValue);
    debouncedFiltering(newValue);
  };

  const globalFilter = table.getState().globalFilter as string | undefined;
  // Keep local state in sync with table state
  React.useEffect(() => {
    setValue(globalFilter ?? "");
  }, [globalFilter]);

  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      className="h-8 w-[150px] lg:w-[250px]"
    />
  );
}
