import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import {
  CULTIVAR_SITEMAP_PAGE_SIZE,
  PUBLIC_LISTING_SITEMAP_PAGE_SIZE,
  serializeSitemapIndex,
  sitemapXmlResponse,
} from "@/lib/sitemap-xml";
import {
  getCultivarSitemapEntryCount,
  getPublicOfferCultivarSitemapEntryCount,
} from "@/server/db/public-cultivar-read-model";
import { getPublicListingRouteEntryCount } from "@/server/db/public-listing-read-model";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = getCanonicalBaseUrl();
  const [cultivarCount, publicOfferCultivarCount, publicListingCount] =
    await Promise.all([
      getCultivarSitemapEntryCount(),
      getPublicOfferCultivarSitemapEntryCount(),
      getPublicListingRouteEntryCount(),
    ]);
  const cultivarPageCount = Math.ceil(
    cultivarCount / CULTIVAR_SITEMAP_PAGE_SIZE,
  );
  const publicOfferCultivarPageCount = Math.ceil(
    publicOfferCultivarCount / CULTIVAR_SITEMAP_PAGE_SIZE,
  );
  const publicListingPageCount = Math.ceil(
    publicListingCount / PUBLIC_LISTING_SITEMAP_PAGE_SIZE,
  );
  const sitemapUrls = [
    `${baseUrl}/sitemaps/main.xml`,
    ...Array.from(
      { length: publicListingPageCount },
      (_, page) => `${baseUrl}/sitemaps/listings/${page}.xml`,
    ),
    ...Array.from(
      { length: publicOfferCultivarPageCount },
      (_, page) => `${baseUrl}/sitemaps/cultivars-with-offers/${page}.xml`,
    ),
    ...Array.from(
      { length: cultivarPageCount },
      (_, page) => `${baseUrl}/sitemaps/cultivars/${page}.xml`,
    ),
  ];

  return sitemapXmlResponse(serializeSitemapIndex(sitemapUrls));
}
