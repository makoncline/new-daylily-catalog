"use client";

import { Input } from "@/components/ui/input";
import { Table } from "@tanstack/react-table";

interface ListsToolbarProps<TData> {
  table: Table<TData>;
}

export function ListsToolbar<TData>({ table }: ListsToolbarProps<TData>) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter lists..."
          value={(table.getState().globalFilter as string) ?? ""}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
      </div>
    </div>
  );
}
