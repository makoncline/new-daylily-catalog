import { NextResponse, type NextRequest } from "next/server";
import { getListingOwnerWithSlugs } from "@/server/db/getLegacyMappings";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { buildLegacyListingRedirectPath } from "@/lib/legacy-route-redirects";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const listingId = searchParams.get("listingId");
  const baseUrl = getCanonicalBaseUrl();

  if (!listingId) {
    return NextResponse.redirect(new URL("/catalogs", baseUrl));
  }

  const listingInfo = await getListingOwnerWithSlugs(listingId);

  if (!listingInfo) {
    return NextResponse.redirect(new URL("/catalogs", baseUrl));
  }

  return NextResponse.redirect(
    new URL(buildLegacyListingRedirectPath(listingId, listingInfo), baseUrl),
  );
}
