import { createListingHandler } from "@/server/public-api/public-read-api";
import { getStorefrontSnapshot } from "@/server/storefront";

interface ListingRouteContext {
  params: Promise<{ listing: string }>;
}

const handleListing = createListingHandler(getStorefrontSnapshot);

export async function GET(
  _request: Request,
  { params }: ListingRouteContext,
): Promise<Response> {
  const { listing } = await params;
  return handleListing(listing);
}
