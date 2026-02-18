import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { type MetadataRoute } from "next";
import { getCultivarSitemapEntries } from "@/server/db/getPublicCultivars";
import { getPublicCatalogRouteEntries } from "@/server/db/getPublicListings";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const sitemap: MetadataRoute.Sitemap = [];

  // Add static pages
  const staticPages = ["", "/catalogs"];

  staticPages.forEach((path) => {
    sitemap.push({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: path === "" ? 1.0 : 0.8,
    });
  });

  const publicCatalogEntries = await getPublicCatalogRouteEntries();
  publicCatalogEntries.forEach((entry) => {
    sitemap.push({
      url: `${baseUrl}/${entry.slug}`,
      lastModified: entry.lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });

    for (let page = 2; page <= entry.totalPages; page += 1) {
      sitemap.push({
        url: `${baseUrl}/${entry.slug}?page=${page}`,
        lastModified: entry.lastModified,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  });

  const cultivarEntries = await getCultivarSitemapEntries();
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
