// src/app/dashboard-two/listings/_components/types.ts
import type { RouterOutputs } from "@/trpc/react";
import type { ImageCollectionItem } from "@/app/dashboard-two/_lib/images-collection";
import type { ListCollectionItem } from "@/app/dashboard-two/_lib/lists-collection";
import type { AhsCollectionItem } from "@/app/dashboard-two/_lib/ahs-collection";

export type DbListing = RouterOutputs["dashboardTwo"]["getListings"][number];
export type DbImage = ImageCollectionItem; // { id, url, order, listingId }
export type DbList = ListCollectionItem; // { id, title, ... }
export type AhsRow = AhsCollectionItem;

export type ListingRow = {
  id: DbListing["id"];
  title: NonNullable<DbListing["title"]>;
  description: DbListing["description"] | null;
  price: DbListing["price"] | null;
  privateNote: DbListing["privateNote"] | null;
  status: DbListing["status"] | null; // null | "HIDDEN"
  createdAt: DbListing["createdAt"] | null;
  updatedAt: DbListing["updatedAt"] | null;

  images: DbImage[];
  lists: Array<Pick<DbList, "id" | "title">>;
  ahsListing: AhsRow | null;
};

export type UiStatus = "published" | "hidden";
