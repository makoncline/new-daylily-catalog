"use client";

import * as React from "react";
import type { Table } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableGlobalFilterProps<TData> {
  table: Table<TData>;
  placeholder?: string;
}

export function DataTableGlobalFilterSkeleton() {
  return <Skeleton className="h-8 w-[150px] lg:w-[250px]" />;
}

export function DataTableGlobalFilter<TData>({
  table,
  placeholder = "Filter...",
}: DataTableGlobalFilterProps<TData>) {
  const state = table.getState();

  return (
    <Input
      placeholder={placeholder}
      value={(state.globalFilter as string) ?? ""}
      onChange={(event) => {
        table.setGlobalFilter(event.target.value);
        table.resetPageIndex(true);
      }}
      className="h-8 w-[150px] lg:w-[250px]"
    />
  );
}
