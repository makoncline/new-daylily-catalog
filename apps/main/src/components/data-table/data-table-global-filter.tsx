"use client";

import React from "react";
import type { Table } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";

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
  const globalFilter: unknown = table.getState().globalFilter;
  const value = typeof globalFilter === "string" ? globalFilter : "";

  const updateGlobalFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    table.setGlobalFilter(newValue);
    if (newValue) {
      table.setSorting([{ id: "title", desc: false }]);
    }
    table.resetPageIndex(true);
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
