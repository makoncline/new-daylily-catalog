import { serializeSitemapUrls, sitemapXmlResponse } from "@/lib/sitemap-xml";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { getMainSitemapEntries } from "@/server/sitemap-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await getMainSitemapEntries(getCanonicalBaseUrl());

  return sitemapXmlResponse(serializeSitemapUrls(entries));
}
