"use client";

import * as React from "react";
import { type Table } from "@tanstack/react-table";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTableForSaleFilterProps<TData> {
  table: Table<TData>;
}

export function DataTableForSaleFilter<TData>({
  table,
}: DataTableForSaleFilterProps<TData>) {
  const priceColumn = table.getColumn("price");

  // If price column doesn't exist, don't render the button
  if (!priceColumn) return null;

  // Check if the price filter is active
  const isPriceFilterActive = (() => {
    const columnFilters = table.getState().columnFilters;
    const priceFilter = columnFilters.find((filter) => filter.id === "price");
    // Check if the filter exists and its value is true
    return (
      priceFilter !== undefined &&
      (priceFilter.value === "true" || priceFilter.value === true)
    );
  })();

  // Toggle the price filter
  const togglePriceFilter = () => {
    if (isPriceFilterActive) {
      priceColumn.setFilterValue(undefined);
    } else {
      priceColumn.setFilterValue(true);
    }
    table.resetPagination();
  };

  return (
    <Button
      variant={"outline"}
      size="sm"
      className={cn(
        "h-8",
        "border-dashed",
        isPriceFilterActive && "bg-secondary",
      )}
      onClick={togglePriceFilter}
    >
      <DollarSign className="mr-2 h-4 w-4" />
      <span>For Sale</span>
    </Button>
  );
}
