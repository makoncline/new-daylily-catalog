import { getPublicCatalogRouteEntries } from "@/server/db/public-listing-read-model";
import { getPublicListingRouteEntries } from "@/server/db/public-listing-read-model";
import type { SitemapUrl } from "@/lib/sitemap-xml";
import { isPublicCultivarSearchEnabled } from "@/config/feature-flags";

export async function getMainSitemapEntries(baseUrl: string) {
  const entries: SitemapUrl[] = [
    {
      url: baseUrl,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/catalogs`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/daylily-database-software`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sell-daylilies-online`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/start-membership`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  if (isPublicCultivarSearchEnabled()) {
    entries.push({
      url: `${baseUrl}/cultivars`,
      changeFrequency: "weekly",
      priority: 0.9,
    });
  }

  const [catalogs, listings] = await Promise.all([
    getPublicCatalogRouteEntries(),
    getPublicListingRouteEntries(),
  ]);

  catalogs.forEach((entry) => {
    entries.push({
      url: `${baseUrl}/${entry.slug}`,
      lastModified: entry.lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });

    for (let page = 2; page <= entry.totalPages; page += 1) {
      entries.push({
        url: `${baseUrl}/${entry.slug}/page/${page}`,
        lastModified: entry.lastModified,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  });

  listings.forEach((entry) => {
    entries.push({
      url: `${baseUrl}/${entry.sellerSlug}/${entry.listingSlug}`,
      lastModified: entry.lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  });

  return entries;
}
