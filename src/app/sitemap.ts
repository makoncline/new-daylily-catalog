import { db } from "@/server/db";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { type MetadataRoute } from "next";
import { STATUS } from "@/config/constants";

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

  // Add user profiles - only canonical versions (by ID)
  const users = await db.user.findMany({
    select: {
      id: true,
      profile: {
        select: {
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
    // Only add canonical user page (by ID)
    sitemap.push({
      url: `${baseUrl}/${user.id}`,
      lastModified: user.profile?.updatedAt ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  // Add listings - only canonical versions (user ID/listing ID)
  const listings = await db.listing.findMany({
    select: {
      id: true,
      userId: true,
      updatedAt: true,
    },
    where: publicListingVisibilityFilter,
  });

  listings.forEach((listing) => {
    // Only add canonical listing URL (user ID/listing ID)
    sitemap.push({
      url: `${baseUrl}/${listing.userId}/${listing.id}`,
      lastModified: listing.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  return sitemap;
}
