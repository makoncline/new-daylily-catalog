"use client";

import * as React from "react";
import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetTableState } from "@/lib/table-utils";

interface DataTableFilterResetProps<TData> {
  table: Table<TData>;
}

export function DataTableFilterReset<TData>({
  table,
}: DataTableFilterResetProps<TData>) {
  const state = table.getState();
  const isFiltered =
    state.columnFilters.length > 0 || Boolean(state.globalFilter);

  if (!isFiltered) return null;

  return (
    <Button variant="ghost" onClick={() => resetTableState(table)} size="sm">
      Reset
      <X aria-hidden="true" data-icon="inline-end" />
    </Button>
  );
}
