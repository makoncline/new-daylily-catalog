import { db } from "@/server/db";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { type MetadataRoute } from "next";
import { STATUS } from "@/config/constants";
import { getCultivarRouteSegments } from "@/server/db/getPublicCultivars";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const sitemap: MetadataRoute.Sitemap = [];
  const publicListingVisibilityFilter = {
    OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
  };

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

  // Add user profiles - canonical versions by slug when available.
  const users = await db.user.findMany({
    select: {
      id: true,
      profile: {
        select: {
          slug: true,
          updatedAt: true,
        },
      },
    },
    where: {
      listings: {
        some: publicListingVisibilityFilter,
      },
    },
  });

  users.forEach((user) => {
    const canonicalUserSlug = user.profile?.slug ?? user.id;
    sitemap.push({
      url: `${baseUrl}/${canonicalUserSlug}`,
      lastModified: user.profile?.updatedAt ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  const cultivarSegments = await getCultivarRouteSegments();
  cultivarSegments.forEach((segment) => {
    sitemap.push({
      url: `${baseUrl}/cultivar/${segment}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  return sitemap;
}
