"use client";

import React from "react";
import type { Table } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "use-debounce";

interface DataTableGlobalFilterProps<TData> {
  table: Table<TData>;
  placeholder?: string;
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
  const updateGlobalFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setValue(newValue);
    debouncedFiltering(newValue);
  };

  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={updateGlobalFilter}
      className="h-8 w-[150px] lg:w-[250px]"
    />
  );
}
