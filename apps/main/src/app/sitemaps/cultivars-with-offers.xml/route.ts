import { serializeSitemapUrls, sitemapXmlResponse } from "@/lib/sitemap-xml";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { getPublicOfferCultivarSitemapEntries } from "@/server/db/public-cultivar-read-model";

export const revalidate = 86400;

export async function GET() {
  const baseUrl = getCanonicalBaseUrl();
  const cultivars = await getPublicOfferCultivarSitemapEntries();
  const entries = cultivars.map((cultivar) => ({
    url: `${baseUrl}/cultivar/${cultivar.segment}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return sitemapXmlResponse(serializeSitemapUrls(entries));
}
