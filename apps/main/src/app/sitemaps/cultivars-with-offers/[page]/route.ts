import {
  CULTIVAR_SITEMAP_PAGE_SIZE,
  serializeSitemapUrls,
  sitemapXmlResponse,
} from "@/lib/sitemap-xml";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import {
  getPublicOfferCultivarSitemapEntries,
  getPublicOfferCultivarSitemapEntryCount,
} from "@/server/db/public-cultivar-read-model";

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

  const cultivarCount = await getPublicOfferCultivarSitemapEntryCount();
  const cultivarPageCount = Math.ceil(
    cultivarCount / CULTIVAR_SITEMAP_PAGE_SIZE,
  );
  if (page >= cultivarPageCount) {
    return new Response("Not Found", { status: 404 });
  }

  const cultivars = await getPublicOfferCultivarSitemapEntries({
    page,
    pageSize: CULTIVAR_SITEMAP_PAGE_SIZE,
  });
  if (cultivars.length === 0) {
    return new Response("Not Found", { status: 404 });
  }

  const baseUrl = getCanonicalBaseUrl();
  const entries = cultivars.map((cultivar) => ({
    url: `${baseUrl}/cultivar/${cultivar.segment}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return sitemapXmlResponse(serializeSitemapUrls(entries));
}
