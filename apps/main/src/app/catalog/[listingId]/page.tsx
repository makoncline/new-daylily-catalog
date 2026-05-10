"use server";

import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildLegacyListingRedirectPath } from "@/lib/legacy-route-redirects";
import { getListingOwnerWithSlugs } from "@/server/db/getLegacyMappings";

export const metadata: Metadata = {
  title: "Listing Redirect | Daylily Catalog",
  description: "Redirecting to the current Daylily Catalog listing page.",
};

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
