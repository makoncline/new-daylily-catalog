import { type RouterOutputs } from "@/trpc/react";
import { type Table } from "@tanstack/react-table";

export type PublicCatalogListing =
  RouterOutputs["public"]["getListings"][number];
type PublicCatalogProfile = RouterOutputs["public"]["getProfile"];
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
  isRefreshingCatalogData?: boolean;
  onRefreshCatalogData?: () => void;
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

export interface PublicCatalogSearchAdvancedPanelProps<
  TData = PublicCatalogListing,
> {
  table: Table<TData>;
  listOptions: PublicCatalogSearchFacetOption[];
  facetOptions: PublicCatalogSearchFacetOptions;
  mode: PublicCatalogSearchMode;
  onModeChange: (mode: PublicCatalogSearchMode) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onSearchSubmit?: () => void;
}
