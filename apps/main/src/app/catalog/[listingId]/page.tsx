"use server";

import { permanentRedirect } from "next/navigation";
import { buildLegacyListingRedirectPath } from "@/lib/legacy-route-redirects";
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

  return permanentRedirect(
    buildLegacyListingRedirectPath(listingId, listingInfo),
  );
}
