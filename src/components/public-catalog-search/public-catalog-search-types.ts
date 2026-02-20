import { type RouterOutputs } from "@/trpc/react";
import { type Column, type Table } from "@tanstack/react-table";

export type PublicCatalogListing =
  RouterOutputs["public"]["getListings"][number];
export type PublicCatalogProfile = RouterOutputs["public"]["getProfile"];
export type PublicCatalogLists = NonNullable<PublicCatalogProfile>["lists"];

export interface PublicCatalogSearchClientProps {
  userId: string;
  userSlugOrId: string;
  lists: PublicCatalogLists;
  initialListings: PublicCatalogListing[];
  totalListingsCount: number;
}

export interface PublicCatalogSearchContentProps {
  lists: PublicCatalogLists;
  listings: PublicCatalogListing[];
  isLoading: boolean;
  totalListingsCount: number;
}

export type PublicCatalogSearchMode = "basic" | "advanced";

export interface PublicCatalogSearchFacetOption {
  label: string;
  value: string;
  count: number;
}

export interface PublicCatalogSearchFacetOptions {
  bloomHabit: PublicCatalogSearchFacetOption[];
  bloomSeason: PublicCatalogSearchFacetOption[];
  form: PublicCatalogSearchFacetOption[];
  ploidy: PublicCatalogSearchFacetOption[];
  foliageType: PublicCatalogSearchFacetOption[];
  fragrance: PublicCatalogSearchFacetOption[];
}

export interface PublicCatalogSearchToolbarProps {
  table: Table<PublicCatalogListing>;
  listsColumn: Column<PublicCatalogListing, unknown> | null;
  listOptions: PublicCatalogSearchFacetOption[];
  onSearchSubmit?: () => void;
}

export interface PublicCatalogSearchAdvancedPanelProps {
  table: Table<PublicCatalogListing>;
  listOptions: PublicCatalogSearchFacetOption[];
  facetOptions: PublicCatalogSearchFacetOptions;
  mode: PublicCatalogSearchMode;
  onModeChange: (mode: PublicCatalogSearchMode) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onSearchSubmit?: () => void;
}
