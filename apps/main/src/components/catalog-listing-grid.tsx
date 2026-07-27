import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function CatalogListingGrid({
  className,
  desktopColumns = 3,
  ...props
}: ComponentProps<"div"> & {
  desktopColumns?: 2 | 3;
}) {
  return (
    <div
      data-slot="catalog-listing-grid"
      className={cn(
        "grid grid-cols-1 gap-6 sm:grid-cols-2",
        desktopColumns === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3",
        className,
      )}
      {...props}
    />
  );
}
