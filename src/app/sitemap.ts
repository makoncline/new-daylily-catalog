import { db } from "@/server/db";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { type MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const sitemap: MetadataRoute.Sitemap = [];

  // Add static pages
  const staticPages = ["", "/catalogs", "/auth-error"];

  staticPages.forEach((path) => {
    sitemap.push({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: path === "" ? 1.0 : 0.8,
    });
  });

  // Add user profiles
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
  });

  users.forEach((user) => {
    // Add canonical user page (by ID)
    sitemap.push({
      url: `${baseUrl}/${user.id}`,
      lastModified: user.profile?.updatedAt ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });

    // Add user page by slug if it exists
    if (user.profile?.slug) {
      sitemap.push({
        url: `${baseUrl}/${user.profile.slug}`,
        lastModified: user.profile.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6, // Slightly lower priority for non-canonical URL
      });
    }
  });

  // Add listings
  const listings = await db.listing.findMany({
    select: {
      id: true,
      slug: true,
      userId: true,
      updatedAt: true,
      user: {
        select: {
          profile: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  listings.forEach((listing) => {
    // Add canonical listing URL (user ID/listing ID)
    sitemap.push({
      url: `${baseUrl}/${listing.userId}/${listing.id}`,
      lastModified: listing.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });

    // Add user slug/listing ID variant if user has slug
    if (listing.user.profile?.slug) {
      sitemap.push({
        url: `${baseUrl}/${listing.user.profile.slug}/${listing.id}`,
        lastModified: listing.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6, // Slightly lower priority for non-canonical URL
      });
    }

    // Add user ID/listing slug variant if listing has slug
    if (listing.slug) {
      sitemap.push({
        url: `${baseUrl}/${listing.userId}/${listing.slug}`,
        lastModified: listing.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6, // Slightly lower priority for non-canonical URL
      });
    }

    // Add user slug/listing slug variant if both have slugs
    if (listing.user.profile?.slug && listing.slug) {
      sitemap.push({
        url: `${baseUrl}/${listing.user.profile.slug}/${listing.slug}`,
        lastModified: listing.updatedAt,
        changeFrequency: "weekly",
        priority: 0.5, // Lower priority for double non-canonical URL
      });
    }
  });

  return sitemap;
}
