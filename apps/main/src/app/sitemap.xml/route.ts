import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import {
  CULTIVAR_SITEMAP_PAGE_SIZE,
  serializeSitemapIndex,
  sitemapXmlResponse,
} from "@/lib/sitemap-xml";
import {
  getCultivarSitemapEntryCount,
  getPublicOfferCultivarSitemapEntryCount,
} from "@/server/db/public-cultivar-read-model";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = getCanonicalBaseUrl();
  const [cultivarCount, publicOfferCultivarCount] = await Promise.all([
    getCultivarSitemapEntryCount(),
    getPublicOfferCultivarSitemapEntryCount(),
  ]);
  const cultivarPageCount = Math.ceil(
    cultivarCount / CULTIVAR_SITEMAP_PAGE_SIZE,
  );
  const publicOfferCultivarPageCount = Math.ceil(
    publicOfferCultivarCount / CULTIVAR_SITEMAP_PAGE_SIZE,
  );
  const sitemapUrls = [
    `${baseUrl}/sitemaps/main.xml`,
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
