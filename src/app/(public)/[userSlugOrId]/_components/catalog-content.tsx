"use client";

import { type RouterOutputs } from "@/trpc/react";
import { useParams } from "next/navigation";
import { PublicCatalogSearchClient } from "@/components/public-catalog-search/public-catalog-search-client";

type Listing = RouterOutputs["public"]["getListings"][number];
type Profile = RouterOutputs["public"]["getProfile"];
type ProfileLists = NonNullable<Profile>["lists"];

interface CatalogContentProps {
  lists: ProfileLists;
  initialListings: Listing[];
}

export function CatalogContent({
  lists,
  initialListings,
}: CatalogContentProps) {
  const params = useParams<{ userSlugOrId: string }>();

  if (!params.userSlugOrId) {
    return null;
  }

  return (
    <PublicCatalogSearchClient
      userSlugOrId={params.userSlugOrId}
      lists={lists}
      initialListings={initialListings}
    />
  );
}
