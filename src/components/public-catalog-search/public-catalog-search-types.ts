import { type RouterOutputs } from "@/trpc/react";
import { type Column, type Table } from "@tanstack/react-table";

export type PublicCatalogListing = RouterOutputs["public"]["getListings"][number];
export type PublicCatalogProfile = RouterOutputs["public"]["getProfile"];
export type PublicCatalogLists = NonNullable<PublicCatalogProfile>["lists"];

export interface PublicCatalogSearchClientProps {
  userSlugOrId: string;
  lists: PublicCatalogLists;
  initialListings: PublicCatalogListing[];
}

export interface PublicCatalogSearchContentProps {
  lists: PublicCatalogLists;
  listings: PublicCatalogListing[];
  isLoading: boolean;
}

export interface PublicCatalogSearchToolbarProps {
  table: Table<PublicCatalogListing>;
  listsColumn: Column<PublicCatalogListing, unknown> | null;
  listOptions: { label: string; value: string; count?: number }[];
}
