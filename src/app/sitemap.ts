import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { type MetadataRoute } from "next";
import {
  getCachedCultivarSitemapEntries,
  getCachedPublicCatalogRouteEntries,
} from "@/server/db/public-cache";

// CACHE_LITERAL_REF: CACHE_CONFIG.PUBLIC.SITEMAP_REVALIDATE_SECONDS
export const revalidate = 604800;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const sitemap: MetadataRoute.Sitemap = [];

  sitemap.push(
    {
      url: `${baseUrl}`,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/catalogs`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  );

  const publicCatalogEntries = await getCachedPublicCatalogRouteEntries();
  publicCatalogEntries.forEach((entry) => {
    sitemap.push({
      url: `${baseUrl}/${entry.slug}`,
      lastModified: entry.lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  const cultivarEntries = await getCachedCultivarSitemapEntries();
  cultivarEntries.forEach((cultivar) => {
    sitemap.push({
      url: `${baseUrl}/cultivar/${cultivar.segment}`,
      ...(cultivar.lastModified
        ? {
            lastModified: cultivar.lastModified,
          }
        : {}),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  return sitemap;
}
