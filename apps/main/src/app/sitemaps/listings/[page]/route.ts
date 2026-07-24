import {
  PUBLIC_LISTING_SITEMAP_PAGE_SIZE,
  serializeSitemapUrls,
  sitemapXmlResponse,
} from "@/lib/sitemap-xml";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import {
  getPublicListingRouteEntries,
  getPublicListingRouteEntryCount,
} from "@/server/db/public-listing-read-model";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ page: string }>;
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { page: pageWithExtension } = await params;
  const match = /^(\d+)\.xml$/.exec(pageWithExtension);
  const page = match?.[1] ? Number.parseInt(match[1], 10) : -1;

  if (page < 0) {
    return new Response("Not Found", { status: 404 });
  }

  const listingCount = await getPublicListingRouteEntryCount();
  const listingPageCount = Math.ceil(
    listingCount / PUBLIC_LISTING_SITEMAP_PAGE_SIZE,
  );
  if (page >= listingPageCount) {
    return new Response("Not Found", { status: 404 });
  }

  const listings = await getPublicListingRouteEntries({
    page,
    pageSize: PUBLIC_LISTING_SITEMAP_PAGE_SIZE,
  });
  if (listings.length === 0) {
    return new Response("Not Found", { status: 404 });
  }

  const baseUrl = getCanonicalBaseUrl();
  const entries = listings.map((listing) => ({
    url: `${baseUrl}/${listing.sellerSlug}/${listing.listingSlug}`,
    lastModified: listing.lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return sitemapXmlResponse(serializeSitemapUrls(entries));
}
