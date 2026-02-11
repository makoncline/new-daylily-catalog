import { APP_CONFIG, STATUS } from "@/config/constants";
import {
  getCultivarRouteCandidates,
  toCultivarRouteSegment,
} from "@/lib/utils/cultivar-utils";
import { db } from "@/server/db";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { getStripeSubscription } from "@/server/stripe/sync-subscription";
import type { CultivarPageData } from "@/types";

const publicListingVisibilityFilter = {
  OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
};

const cultivarAhsListingSelect = {
  id: true,
  name: true,
  ahsImageUrl: true,
  hybridizer: true,
  year: true,
  scapeHeight: true,
  bloomSize: true,
  bloomSeason: true,
  form: true,
  ploidy: true,
  foliageType: true,
  bloomHabit: true,
  budcount: true,
  branches: true,
  sculpting: true,
  foliage: true,
  flower: true,
  fragrance: true,
  parentage: true,
  color: true,
} as const;

export async function getCultivarRouteSegments(): Promise<string[]> {
  const cultivars = await db.cultivarReference.findMany({
    where: APP_CONFIG.PUBLIC_ROUTES.GENERATE_ALL_CULTIVAR_PAGES
      ? {
          normalizedName: {
            not: null,
          },
        }
      : {
          normalizedName: {
            not: null,
          },
          listings: {
            some: publicListingVisibilityFilter,
          },
        },
    select: {
      normalizedName: true,
    },
  });

  const uniqueSegments = new Set<string>();

  cultivars.forEach((cultivar) => {
    const slug = toCultivarRouteSegment(cultivar.normalizedName);
    if (slug) {
      uniqueSegments.add(slug);
    }
  });

  return Array.from(uniqueSegments).sort();
}

export async function getPublicCultivarPage(
  cultivarSegment: string,
): Promise<CultivarPageData | null> {
  const normalizedCultivarNames = getCultivarRouteCandidates(cultivarSegment);

  if (normalizedCultivarNames.length === 0) {
    return null;
  }

  const cultivarReference = await db.cultivarReference.findFirst({
    where: {
      normalizedName: {
        in: normalizedCultivarNames,
      },
    },
    select: {
      id: true,
      normalizedName: true,
      ahsListing: {
        select: cultivarAhsListingSelect,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!cultivarReference) {
    return null;
  }

  const listingRows = await db.listing.findMany({
    where: {
      cultivarReference: {
        normalizedName: {
          in: normalizedCultivarNames,
        },
      },
      ...publicListingVisibilityFilter,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      description: true,
      updatedAt: true,
      userId: true,
      images: {
        select: {
          id: true,
          url: true,
        },
        orderBy: {
          order: "asc",
        },
      },
      lists: {
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          title: "asc",
        },
      },
    },
  });

  const userIds = Array.from(new Set(listingRows.map((listing) => listing.userId)));

  const users = await db.user.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: {
      id: true,
      createdAt: true,
      stripeCustomerId: true,
      profile: {
        select: {
          slug: true,
          title: true,
          description: true,
          location: true,
          updatedAt: true,
          images: {
            orderBy: {
              order: "asc",
            },
            select: {
              id: true,
              url: true,
            },
          },
        },
      },
      _count: {
        select: {
          listings: {
            where: publicListingVisibilityFilter,
          },
          lists: true,
        },
      },
    },
  });

  const usersWithSubscription = await Promise.all(
    users.map(async (user) => {
      const subscription = await getStripeSubscription(user.stripeCustomerId);
      return {
        ...user,
        hasActiveSubscription: hasActiveSubscription(subscription.status),
      };
    }),
  );

  const userById = new Map(
    usersWithSubscription.map((user) => [
      user.id,
      {
        userId: user.id,
        slug: user.profile?.slug ?? user.id,
        title: user.profile?.title ?? user.profile?.slug ?? "Unnamed Garden",
        createdAt: user.createdAt,
        updatedAt: user.profile?.updatedAt ?? user.createdAt,
        description: user.profile?.description ?? null,
        location: user.profile?.location ?? null,
        listingCount: user._count.listings,
        listCount: user._count.lists,
        hasActiveSubscription: user.hasActiveSubscription,
        profileImages:
          user.profile?.images.map((image) => ({
            id: image.id,
            url: image.url,
          })) ?? [],
      },
    ]),
  );

  const catalogsMap = new Map<
    string,
    {
      userId: string;
      slug: string;
      title: string;
      createdAt: Date;
      updatedAt: Date;
      description: string | null;
      location: string | null;
      listingCount: number;
      listCount: number;
      hasActiveSubscription: boolean;
      profileImages: Array<{ id: string; url: string }>;
      cultivarUploadedImageCount: number;
      cultivarListings: Array<{
        id: string;
        title: string;
        slug: string;
        price: number | null;
        description: string | null;
        updatedAt: Date;
        imageCount: number;
        previewImageUrl: string | null;
        lists: Array<{ id: string; title: string }>;
      }>;
    }
  >();

  listingRows.forEach((listing) => {
    const user = userById.get(listing.userId);

    // Cultivar pages only include Pro catalogs.
    if (!user?.hasActiveSubscription) {
      return;
    }

    if (!catalogsMap.has(listing.userId)) {
      catalogsMap.set(listing.userId, {
        ...user,
        cultivarUploadedImageCount: 0,
        cultivarListings: [],
      });
    }

    const catalog = catalogsMap.get(listing.userId);
    if (!catalog) {
      return;
    }

    const imageCount = listing.images.length;

    catalog.cultivarUploadedImageCount += imageCount;
    catalog.cultivarListings.push({
      id: listing.id,
      title: listing.title,
      slug: listing.slug,
      price: listing.price,
      description: listing.description,
      updatedAt: listing.updatedAt,
      imageCount,
      previewImageUrl: listing.images[0]?.url ?? null,
      lists: listing.lists,
    });
  });

  const catalogs = Array.from(catalogsMap.values())
    .map((catalog) => ({
      ...catalog,
      cultivarListings: catalog.cultivarListings.sort((a, b) => {
        const aForSale = a.price !== null ? 1 : 0;
        const bForSale = b.price !== null ? 1 : 0;

        if (aForSale !== bForSale) {
          return bForSale - aForSale;
        }

        if (a.imageCount !== b.imageCount) {
          return b.imageCount - a.imageCount;
        }

        return b.updatedAt.getTime() - a.updatedAt.getTime();
      }),
    }))
    .sort((a, b) => {
      if (a.cultivarUploadedImageCount !== b.cultivarUploadedImageCount) {
        return b.cultivarUploadedImageCount - a.cultivarUploadedImageCount;
      }

      if (a.listingCount !== b.listingCount) {
        return b.listingCount - a.listingCount;
      }

      return a.title.localeCompare(b.title);
    });

  return {
    cultivar: {
      id: cultivarReference.id,
      normalizedName: cultivarReference.normalizedName,
      ahsListing: cultivarReference.ahsListing,
    },
    catalogs,
  };
}
