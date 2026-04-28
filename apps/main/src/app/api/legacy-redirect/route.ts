import { NextResponse, type NextRequest } from "next/server";
import { getListingOwnerWithSlugs } from "@/server/db/getLegacyMappings";
import { getRequestBaseUrl } from "@/lib/utils/getBaseUrl";
import { buildLegacyListingRedirectPath } from "@/lib/legacy-route-redirects";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const listingId = searchParams.get("listingId");
  const baseUrl = getRequestBaseUrl(request.headers);

  if (!listingId) {
    return NextResponse.redirect(new URL("/catalogs", baseUrl));
  }

  // Find the user who owns this listing along with available slugs
  const listingInfo = await getListingOwnerWithSlugs(listingId);

  if (!listingInfo) {
    // If we can't find the owner, redirect to the catalogs page
    return NextResponse.redirect(new URL("/catalogs", baseUrl));
  }

  return NextResponse.redirect(
    new URL(buildLegacyListingRedirectPath(listingId, listingInfo), baseUrl),
  );
}
