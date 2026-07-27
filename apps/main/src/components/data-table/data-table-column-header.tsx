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
import React from "react";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: React.ReactNode;
  className?: string;
  enableFilter?: boolean;
  onQueryChange?: () => void;
}

const ACTIVE_COLUMN_FILTER_KEY = "active-column-filter";

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  enableFilter,
  onQueryChange,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const columnFilterValue = column.getFilterValue();
  const value = typeof columnFilterValue === "string" ? columnFilterValue : "";
  const filterInputRef = React.useRef<HTMLInputElement>(null);
  const [filterOpen, setFilterOpen] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.sessionStorage.getItem(ACTIVE_COLUMN_FILTER_KEY) === column.id
    );
  });

  const updateFilterOpen = (open: boolean) => {
    setFilterOpen(open);
    if (typeof window === "undefined") return;
    if (open) {
      window.sessionStorage.setItem(ACTIVE_COLUMN_FILTER_KEY, column.id);
    } else if (
      window.sessionStorage.getItem(ACTIVE_COLUMN_FILTER_KEY) === column.id
    ) {
      window.sessionStorage.removeItem(ACTIVE_COLUMN_FILTER_KEY);
    }
  };

  const updateColumnFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ACTIVE_COLUMN_FILTER_KEY, column.id);
    }
    setFilterOpen(true);
    onQueryChange?.();
    column.setFilterValue(event.target.value);
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
          onClick={(event) => {
            event.stopPropagation();
            onQueryChange?.();
            column.toggleSorting(column.getIsSorted() === "asc");
          }}
        >
          <span>{title}</span>
          {column.getIsSorted() === "desc" ? (
            <ArrowDownIcon className="size-4" />
          ) : column.getIsSorted() === "asc" ? (
            <ArrowUpIcon className="size-4" />
          ) : (
            <CaretSortIcon className="size-4" />
          )}
        </Button>
      ) : (
        <div>{title}</div>
      )}

      {enableFilter && (
        <Popover open={filterOpen} onOpenChange={updateFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-muted size-8 p-0"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <Search className="size-4" />
              <span className="sr-only">
                Filter {typeof title === "string" ? title.toLowerCase() : ""}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[200px] p-2"
            align="start"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              filterInputRef.current?.focus({ preventScroll: true });
            }}
          >
            <Input
              ref={filterInputRef}
              placeholder={`Filter ${typeof title === "string" ? title.toLowerCase() : ""}...`}
              value={value}
              onChange={updateColumnFilter}
              className="h-8"
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
