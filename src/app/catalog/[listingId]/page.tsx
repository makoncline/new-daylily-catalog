"use server";

import { permanentRedirect } from "next/navigation";
import { getListingOwnerWithSlugs } from "@/server/db/getLegacyMappings";

interface CatalogLegacyRoutePageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function CatalogLegacyRoutePage({
  params,
}: CatalogLegacyRoutePageProps) {
  const { listingId } = await params;

  const listingInfo = await getListingOwnerWithSlugs(listingId);

  if (!listingInfo) {
    return permanentRedirect("/catalogs");
  }

  if (listingInfo.userSlug && listingInfo.listingSlug) {
    return permanentRedirect(`/${listingInfo.userSlug}/${listingInfo.listingSlug}`);
  }

  if (listingInfo.userSlug) {
    return permanentRedirect(`/${listingInfo.userSlug}/${listingId}`);
  }

  if (listingInfo.listingSlug) {
    return permanentRedirect(`/${listingInfo.userId}/${listingInfo.listingSlug}`);
  }

  return permanentRedirect(`/${listingInfo.userId}/${listingId}`);
}
