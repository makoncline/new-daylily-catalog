import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import {
  CULTIVAR_SITEMAP_PAGE_SIZE,
  serializeSitemapIndex,
  sitemapXmlResponse,
} from "@/lib/sitemap-xml";
import { getCultivarSitemapEntryCount } from "@/server/db/public-cultivar-read-model";

export const revalidate = 86400;

export async function GET() {
  const baseUrl = getCanonicalBaseUrl();
  const cultivarCount = await getCultivarSitemapEntryCount();
  const cultivarPageCount = Math.ceil(
    cultivarCount / CULTIVAR_SITEMAP_PAGE_SIZE,
  );
  const sitemapUrls = [
    `${baseUrl}/sitemaps/main.xml`,
    ...Array.from(
      { length: cultivarPageCount },
      (_, page) => `${baseUrl}/sitemaps/cultivars/${page}.xml`,
    ),
  ];

  return sitemapXmlResponse(serializeSitemapIndex(sitemapUrls));
}
