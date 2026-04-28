"use client";

import { type Table } from "@tanstack/react-table";
import { type FormEvent } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type PublicCatalogListing } from "./public-catalog-search-types";

interface PublicCatalogSearchQueryInputsProps {
  table: Table<PublicCatalogListing>;
  onSubmit?: () => void;
  layout?: "inline" | "stacked";
}

export function PublicCatalogSearchQueryInputs({
  table,
  onSubmit,
  layout = "inline",
}: PublicCatalogSearchQueryInputsProps) {
  const titleColumn = table.getColumn("title") ?? null;
  const globalFilter = table.getState().globalFilter as unknown;
  const titleFilter = titleColumn?.getFilterValue();
  const allFieldsValue =
    typeof globalFilter === "string" ? globalFilter : "";
  const titleOnlyValue = typeof titleFilter === "string" ? titleFilter : "";

  const debouncedGlobalFilter = useDebouncedCallback((filterValue: string) => {
    table.setGlobalFilter(filterValue);

    if (filterValue) {
      table.setSorting([{ id: "title", desc: false }]);
    }

    table.resetPageIndex(true);
  }, 200);

  const debouncedTitleFilter = useDebouncedCallback((filterValue: string) => {
    titleColumn?.setFilterValue(filterValue.length > 0 ? filterValue : undefined);
    table.resetPagination();
  }, 200);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    debouncedGlobalFilter.flush();
    debouncedTitleFilter.flush();

    onSubmit?.();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full" data-testid="search-query-form">
      <div
        className={cn(
          "grid gap-2",
          layout === "inline" ? "sm:grid-cols-2" : "grid-cols-1",
        )}
      >
        <Input
          key={`all-fields-${allFieldsValue}`}
          placeholder="Search all fields..."
          defaultValue={allFieldsValue}
          className={layout === "inline" ? "h-8" : "h-9"}
          data-testid="search-all-fields-input"
          onChange={(event) => {
            debouncedGlobalFilter(event.target.value);
          }}
        />

        <Input
          key={`title-only-${titleOnlyValue}`}
          placeholder="Search title only..."
          defaultValue={titleOnlyValue}
          className={layout === "inline" ? "h-8" : "h-9"}
          data-testid="search-title-only-input"
          onChange={(event) => {
            debouncedTitleFilter(event.target.value);
          }}
        />
      </div>
    </form>
  );
}
