import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader, TooltipCell } from "@/components/data-table";
import { LISTING_TABLE_COLUMN_NAMES } from "@/config/constants";
import {
  type ListingData,
  exactMatchFilter,
  formFacetFilter,
  numericRangeFilter,
  textContainsFilter,
} from "./listing-table-model";

// Each cultivar field has the same display and sorting behavior.
const cultivarFields = [
  { id: "hybridizer", filterFn: textContainsFilter },
  { id: "year", filterFn: numericRangeFilter },
  { id: "scapeHeight", filterFn: numericRangeFilter },
  { id: "bloomSize", filterFn: numericRangeFilter },
  { id: "bloomSeason", filterFn: exactMatchFilter },
  { id: "ploidy", filterFn: exactMatchFilter },
  { id: "foliageType", filterFn: exactMatchFilter },
  { id: "bloomHabit", filterFn: exactMatchFilter },
  { id: "color", filterFn: textContainsFilter },
  { id: "form", filterFn: formFacetFilter },
  { id: "fragrance", filterFn: exactMatchFilter },
  { id: "budcount", filterFn: numericRangeFilter },
  { id: "branches", filterFn: numericRangeFilter },
] as const;

export function getCultivarListingColumns(): ColumnDef<ListingData>[] {
  return cultivarFields.map(({ id, filterFn }) => ({
    id,
    meta: { title: LISTING_TABLE_COLUMN_NAMES[id] },
    accessorFn: (row) => row.ahsListing?.[id] ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES[id]}
      />
    ),
    cell: ({ row }) => (
      <TooltipCell
        content={row.original.ahsListing?.[id] ?? null}
        lines={id === "color" ? 3 : 1}
      />
    ),
    filterFn,
    enableSorting: true,
    enableHiding: true,
  }));
}
