import { serializeSitemapUrls, sitemapXmlResponse } from "@/lib/sitemap-xml";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { getMainSitemapEntries } from "@/server/sitemap-data";

export const revalidate = 86400;

export async function GET() {
  const entries = await getMainSitemapEntries(getCanonicalBaseUrl());

  return sitemapXmlResponse(serializeSitemapUrls(entries));
}
