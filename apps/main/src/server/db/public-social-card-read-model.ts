import { TRPCError } from "@trpc/server";
import type { PublicSocialCardData, SocialCardKind } from "@/lib/social-card";
import { replicaDb } from "@/server/db";
import {
  getListings,
  getPublicListingCardsByIds,
  getPublicListingDetail,
  publicListingSelect,
  transformListings,
} from "@/server/db/public-listing-read-model";
import { getPublicProfile } from "@/server/db/public-seller-read-model";
import {
  isPublicList,
  isPublished,
} from "@/server/db/public-visibility/filters";

function uniqueImageUrls(imageUrls: Array<string | null | undefined>) {
  return Array.from(
    new Set(imageUrls.filter((url): url is string => Boolean(url))),
  ).slice(0, 3);
}

async function getCatalogSocialCardData(
  id: string,
): Promise<PublicSocialCardData> {
  const profile = await getPublicProfile(id);
  const listings = transformListings(
    await getListings({ userId: profile.id, limit: 8 }),
  );

  return {
    kind: "catalog",
    title: profile.title ?? "Daylily Catalog",
    location: profile.location,
    listingCount: profile.listingCount,
    imageUrls: uniqueImageUrls([
      profile.images[0]?.url,
      ...listings.map((listing) => listing.images[0]?.url),
    ]),
  };
}

async function getListSocialCardData(
  id: string,
): Promise<PublicSocialCardData> {
  const list = await replicaDb.list.findFirst({
    where: {
      id,
      ...isPublicList(),
    },
    select: {
      title: true,
      user: {
        select: {
          profile: {
            select: {
              title: true,
            },
          },
        },
      },
      listings: {
        where: isPublished(),
        select: {
          id: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 8,
      },
      _count: {
        select: {
          listings: {
            where: isPublished(),
          },
        },
      },
    },
  });

  if (!list) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "List not found",
    });
  }

  const listings = await getPublicListingCardsByIds(
    list.listings.map((listing) => listing.id),
  );

  return {
    kind: "list",
    title: list.title,
    sellerTitle: list.user.profile?.title ?? "Daylily Catalog",
    listingCount: list._count.listings,
    imageUrls: uniqueImageUrls([
      ...listings.map((listing) => listing.images[0]?.url),
    ]),
  };
}

async function getForSaleSocialCardData(
  id: string,
): Promise<PublicSocialCardData> {
  const [profile, listingRows, listingCount] = await Promise.all([
    getPublicProfile(id),
    replicaDb.listing.findMany({
      where: {
        userId: id,
        ...isPublished(),
        price: { gt: 0 },
      },
      select: publicListingSelect,
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    replicaDb.listing.count({
      where: {
        userId: id,
        ...isPublished(),
        price: {
          gt: 0,
        },
      },
    }),
  ]);
  const listings = transformListings(listingRows);

  return {
    kind: "list",
    title: "For Sale",
    sellerTitle: profile.title ?? "Daylily Catalog",
    listingCount,
    imageUrls: uniqueImageUrls([
      ...listings.map((listing) => listing.images[0]?.url),
    ]),
  };
}

async function getListingSocialCardData(
  id: string,
): Promise<PublicSocialCardData> {
  const listing = await getPublicListingDetail(id);

  return {
    kind: "listing",
    title: listing.title,
    sellerTitle: listing.sellerTitle ?? "Daylily Catalog",
    hybridizer:
      listing.ahsListing?.hybridizer?.toLowerCase() === "unknown"
        ? null
        : (listing.ahsListing?.hybridizer ?? null),
    year: listing.ahsListing?.year ?? null,
    price: listing.price,
    imageUrls: uniqueImageUrls([...listing.images.map((image) => image.url)]),
  };
}

export function getPublicSocialCardData(kind: SocialCardKind, id: string) {
  switch (kind) {
    case "catalog":
      return getCatalogSocialCardData(id);
    case "for-sale":
      return getForSaleSocialCardData(id);
    case "list":
      return getListSocialCardData(id);
    case "listing":
      return getListingSocialCardData(id);
  }
}
