import { NextResponse, type NextRequest } from "next/server";
import { getListingOwnerWithSlugs } from "@/server/db/getLegacyMappings";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const listingId = searchParams.get("listingId");
  const baseUrl = getBaseUrl();

  if (!listingId) {
    return NextResponse.redirect(new URL("/catalogs", baseUrl));
  }

  // Find the user who owns this listing along with available slugs
  const listingInfo = await getListingOwnerWithSlugs(listingId);

  if (!listingInfo) {
    // If we can't find the owner, redirect to the catalogs page
    return NextResponse.redirect(new URL("/catalogs", baseUrl));
  }

  // Determine the best URL path to redirect to, preferring slugs when available
  let redirectPath: string;

  if (listingInfo.userSlug && listingInfo.listingSlug) {
    // Both user and listing have slugs - use the most friendly URL
    redirectPath = `/${listingInfo.userSlug}/${listingInfo.listingSlug}`;
  } else if (listingInfo.userSlug) {
    // Only user has a slug
    redirectPath = `/${listingInfo.userSlug}/${listingId}`;
  } else if (listingInfo.listingSlug) {
    // Only listing has a slug
    redirectPath = `/${listingInfo.userId}/${listingInfo.listingSlug}`;
  } else {
    // No slugs available - use IDs
    redirectPath = `/${listingInfo.userId}/${listingId}`;
  }

  // Redirect to the new URL pattern
  return NextResponse.redirect(new URL(redirectPath, baseUrl));
}
