import { APP_CONFIG, STATUS } from "@/config/constants";
import {
  getCultivarRouteCandidates,
  toCultivarRouteSegment,
} from "@/lib/utils/cultivar-utils";
import { db } from "@/server/db";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { getStripeSubscription } from "@/server/stripe/sync-subscription";

const publicListingVisibilityFilter = {
  OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
};

const getCultivarReferenceLookupWhereClause = () => ({
  normalizedName: {
    not: null,
  },
});

const getCultivarReferenceDiscoveryWhereClause = () =>
  APP_CONFIG.PUBLIC_ROUTES.GENERATE_ALL_CULTIVAR_PAGES
    ? getCultivarReferenceLookupWhereClause()
    : {
        ...getCultivarReferenceLookupWhereClause(),
        listings: {
          some: publicListingVisibilityFilter,
        },
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

const CULTIVAR_SPEC_FIELDS = [
  ["Scape Height", "scapeHeight"],
  ["Bloom Size", "bloomSize"],
  ["Bloom Season", "bloomSeason"],
  ["Form", "form"],
  ["Ploidy", "ploidy"],
  ["Foliage Type", "foliageType"],
  ["Bloom Habit", "bloomHabit"],
  ["Bud Count", "budcount"],
  ["Branches", "branches"],
  ["Sculpting", "sculpting"],
  ["Foliage", "foliage"],
  ["Flower", "flower"],
  ["Fragrance", "fragrance"],
  ["Parentage", "parentage"],
  ["Color", "color"],
] as const;

const TOP_QUICK_SPEC_LABELS = new Set([
  "Ploidy",
  "Bloom Size",
  "Scape Height",
  "Bud Count",
  "Branches",
  "Parentage",
  "Color",
]);

type CultivarAhsListing = {
  id: string;
  name: string | null;
  ahsImageUrl: string | null;
  hybridizer: string | null;
  year: string | null;
  scapeHeight: string | null;
  bloomSize: string | null;
  bloomSeason: string | null;
  form: string | null;
  ploidy: string | null;
  foliageType: string | null;
  bloomHabit: string | null;
  budcount: string | null;
  branches: string | null;
  sculpting: string | null;
  foliage: string | null;
  flower: string | null;
  fragrance: string | null;
  parentage: string | null;
  color: string | null;
};

function getCultivarDisplayName(
  normalizedName: string | null,
  ahsListing: CultivarAhsListing | null,
) {
  return ahsListing?.name ?? normalizedName ?? "Unknown Cultivar";
}

function getCultivarTraitChips(ahsListing: CultivarAhsListing | null) {
  if (!ahsListing) {
    return [];
  }

  return [
    ahsListing.color,
    ahsListing.bloomSeason,
    ahsListing.ploidy,
    ahsListing.foliageType,
    ahsListing.bloomSize,
    ahsListing.scapeHeight,
  ].filter((value): value is string => Boolean(value));
}

function getCultivarSpecs(ahsListing: CultivarAhsListing | null) {
  if (!ahsListing) {
    return {
      top: [] as Array<{ label: string; value: string }>,
      all: [] as Array<{ label: string; value: string }>,
    };
  }

  const all = CULTIVAR_SPEC_FIELDS.flatMap(([label, key]) => {
    const value = ahsListing[key];

    return value ? [{ label, value }] : [];
  });

  const top = all.filter((spec) => TOP_QUICK_SPEC_LABELS.has(spec.label));

  return {
    top,
    all,
  };
}

function getMaxDate(dates: Array<Date | undefined>): Date | undefined {
  return dates.reduce<Date | undefined>((latest, value) => {
    if (!value) {
      return latest;
    }

    if (!latest || value.getTime() > latest.getTime()) {
      return value;
    }

    return latest;
  }, undefined);
}

function getBestMatchScore(offer: {
  price: number | null;
  imageCount: number;
  updatedAt: Date;
}) {
  return {
    forSale: offer.price !== null ? 1 : 0,
    imageCount: offer.imageCount,
    updatedAt: offer.updatedAt.getTime(),
  };
}

function sortOffersBestMatch(
  a: {
    price: number | null;
    imageCount: number;
    updatedAt: Date;
    title: string;
  },
  b: {
    price: number | null;
    imageCount: number;
    updatedAt: Date;
    title: string;
  },
) {
  const scoreA = getBestMatchScore(a);
  const scoreB = getBestMatchScore(b);

  if (scoreA.forSale !== scoreB.forSale) {
    return scoreB.forSale - scoreA.forSale;
  }

  if (scoreA.imageCount !== scoreB.imageCount) {
    return scoreB.imageCount - scoreA.imageCount;
  }

  if (scoreA.updatedAt !== scoreB.updatedAt) {
    return scoreB.updatedAt - scoreA.updatedAt;
  }

  return a.title.localeCompare(b.title);
}

function getSortableYear(year: string | null) {
  if (!year) {
    return 0;
  }

  const parsedYear = Number.parseInt(year, 10);
  return Number.isNaN(parsedYear) ? 0 : parsedYear;
}

async function getCultivarNormalizedNamesForSegment(segment: string) {
  const cultivars = await db.cultivarReference.findMany({
    where: getCultivarReferenceLookupWhereClause(),
    select: {
      normalizedName: true,
    },
  });

  return cultivars.flatMap((cultivar) => {
    const normalizedName = cultivar.normalizedName;
    if (!normalizedName) {
      return [];
    }

    return toCultivarRouteSegment(normalizedName) === segment
      ? [normalizedName]
      : [];
  });
}

async function findCultivarReferenceByNormalizedNames(
  normalizedNames: string[],
) {
  if (normalizedNames.length === 0) {
    return null;
  }

  return db.cultivarReference.findFirst({
    where: {
      AND: [
        getCultivarReferenceLookupWhereClause(),
        {
          normalizedName: {
            in: normalizedNames,
          },
        },
      ],
    },
    select: {
      id: true,
      normalizedName: true,
      updatedAt: true,
      ahsListing: {
        select: cultivarAhsListingSelect,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function getCultivarRouteSegments(): Promise<string[]> {
  const cultivars = await db.cultivarReference.findMany({
    where: getCultivarReferenceDiscoveryWhereClause(),
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

export async function getCultivarSitemapEntries(): Promise<
  Array<{
    segment: string;
    lastModified?: Date;
  }>
> {
  const segmentMap = new Map<
    string,
    {
      segment: string;
      lastModified?: Date;
    }
  >();

  const upsertSegment = (
    normalizedName: string | null,
    lastModified: Date | undefined,
  ) => {
    const segment = toCultivarRouteSegment(normalizedName);
    if (!segment) {
      return;
    }

    const existingSegmentEntry = segmentMap.get(segment);
    if (!existingSegmentEntry) {
      segmentMap.set(segment, {
        segment,
        lastModified,
      });
      return;
    }

    if (
      lastModified &&
      (!existingSegmentEntry.lastModified ||
        lastModified.getTime() > existingSegmentEntry.lastModified.getTime())
    ) {
      segmentMap.set(segment, {
        segment,
        lastModified,
      });
    }
  };

  if (!APP_CONFIG.PUBLIC_ROUTES.GENERATE_ALL_CULTIVAR_PAGES) {
    const listingRows = await db.listing.findMany({
      where: {
        cultivarReferenceId: {
          not: null,
        },
        ...publicListingVisibilityFilter,
        cultivarReference: {
          is: getCultivarReferenceLookupWhereClause(),
        },
      },
      select: {
        updatedAt: true,
        cultivarReference: {
          select: {
            normalizedName: true,
            updatedAt: true,
          },
        },
      },
    });

    listingRows.forEach((listing) => {
      const cultivar = listing.cultivarReference;
      if (!cultivar) {
        return;
      }

      const cultivarLastModified =
        listing.updatedAt.getTime() > cultivar.updatedAt.getTime()
          ? listing.updatedAt
          : cultivar.updatedAt;

      upsertSegment(cultivar.normalizedName, cultivarLastModified);
    });

    return Array.from(segmentMap.values()).sort((a, b) =>
      a.segment.localeCompare(b.segment),
    );
  }

  const cultivars = await db.cultivarReference.findMany({
    where: getCultivarReferenceLookupWhereClause(),
    select: {
      normalizedName: true,
      updatedAt: true,
      listings: {
        where: publicListingVisibilityFilter,
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
        select: {
          updatedAt: true,
        },
      },
    },
  });

  cultivars.forEach((cultivar) => {
    const linkedListingUpdatedAt = cultivar.listings[0]?.updatedAt;
    const cultivarLastModified =
      linkedListingUpdatedAt &&
      linkedListingUpdatedAt.getTime() > cultivar.updatedAt.getTime()
        ? linkedListingUpdatedAt
        : cultivar.updatedAt;

    upsertSegment(cultivar.normalizedName, cultivarLastModified);
  });

  return Array.from(segmentMap.values()).sort((a, b) =>
    a.segment.localeCompare(b.segment),
  );
}

export async function getPublicCultivarPage(cultivarSegment: string) {
  const canonicalSegment = toCultivarRouteSegment(cultivarSegment);
  if (!canonicalSegment) {
    return null;
  }

  const normalizedCultivarNames = getCultivarRouteCandidates(cultivarSegment);
  const matchedNormalizedNames = new Set(normalizedCultivarNames);

  let cultivarReference = await findCultivarReferenceByNormalizedNames(
    normalizedCultivarNames,
  );

  if (!cultivarReference) {
    const normalizedNamesFromSlug =
      await getCultivarNormalizedNamesForSegment(canonicalSegment);

    normalizedNamesFromSlug.forEach((name) => matchedNormalizedNames.add(name));

    cultivarReference = await findCultivarReferenceByNormalizedNames(
      normalizedNamesFromSlug,
    );
  }

  if (!cultivarReference) {
    return null;
  }

  if (cultivarReference.normalizedName) {
    matchedNormalizedNames.add(cultivarReference.normalizedName);
  }

  const listingRows = await db.listing.findMany({
    where: {
      cultivarReference: {
        normalizedName: {
          in: Array.from(matchedNormalizedNames),
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
          updatedAt: true,
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

  const userIds = Array.from(
    new Set(listingRows.map((listing) => listing.userId)),
  );

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
      let hasSubscription = false;

      try {
        const subscription = await getStripeSubscription(user.stripeCustomerId);
        hasSubscription = hasActiveSubscription(subscription.status);
      } catch (error) {
        console.error("Failed to resolve subscription for cultivar page:", error);
      }

      return {
        ...user,
        hasActiveSubscription: hasSubscription,
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

  const gardenCardsMap = new Map<
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
      offers: Array<{
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

  const photoRows: Array<{
    id: string;
    url: string;
    updatedAt: Date;
    listingId: string;
    listingTitle: string;
    sellerSlug: string;
    sellerTitle: string;
  }> = [];

  listingRows.forEach((listing) => {
    const seller = userById.get(listing.userId);

    // Cultivar offers are limited to Pro catalogs.
    if (!seller?.hasActiveSubscription) {
      return;
    }

    if (!gardenCardsMap.has(listing.userId)) {
      gardenCardsMap.set(listing.userId, {
        ...seller,
        offers: [],
      });
    }

    const gardenCard = gardenCardsMap.get(listing.userId);
    if (!gardenCard) {
      return;
    }

    gardenCard.offers.push({
      id: listing.id,
      title: listing.title,
      slug: listing.slug,
      price: listing.price,
      description: listing.description,
      updatedAt: listing.updatedAt,
      imageCount: listing.images.length,
      previewImageUrl: listing.images[0]?.url ?? null,
      lists: listing.lists,
    });

    listing.images.forEach((image) => {
      photoRows.push({
        id: image.id,
        url: image.url,
        updatedAt: image.updatedAt,
        listingId: listing.id,
        listingTitle: listing.title,
        sellerSlug: seller.slug,
        sellerTitle: seller.title,
      });
    });
  });

  const gardenCards = Array.from(gardenCardsMap.values())
    .map((gardenCard) => ({
      ...gardenCard,
      offers: gardenCard.offers.sort(sortOffersBestMatch),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const allOffers = gardenCards.flatMap((gardenCard) => gardenCard.offers);

  const gardensCount = gardenCards.length;
  const offersCount = allOffers.length;
  const forSaleCount = allOffers.filter((offer) => offer.price !== null).length;
  const prices = allOffers
    .map((offer) => offer.price)
    .filter((price): price is number => price !== null);

  const gardenPhotos = photoRows
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 12)
    .map((image) => ({
      id: image.id,
      url: image.url,
      listingId: image.listingId,
      listingTitle: image.listingTitle,
      sellerSlug: image.sellerSlug,
      sellerTitle: image.sellerTitle,
      updatedAt: image.updatedAt,
    }));

  const heroImages = [
    ...(cultivarReference.ahsListing?.ahsImageUrl
      ? [
          {
            id: `ahs-${cultivarReference.ahsListing.id}`,
            url: cultivarReference.ahsListing.ahsImageUrl,
            alt: cultivarReference.ahsListing.name
              ? `${cultivarReference.ahsListing.name} AHS image`
              : "AHS cultivar image",
            source: "ahs" as const,
            listingId: null,
            sellerSlug: null,
            sellerTitle: null,
          },
        ]
      : []),
  ];

  const allSpecs = getCultivarSpecs(cultivarReference.ahsListing);

  const relatedByHybridizer = cultivarReference.ahsListing?.hybridizer
    ? await db.cultivarReference.findMany({
        where: {
          id: {
            not: cultivarReference.id,
          },
          ...getCultivarReferenceLookupWhereClause(),
          ahsListing: {
            is: {
              hybridizer: cultivarReference.ahsListing.hybridizer,
            },
          },
          OR: [
            {
              ahsListing: {
                is: {
                  ahsImageUrl: {
                    not: null,
                  },
                },
              },
            },
            {
              listings: {
                some: {
                  ...publicListingVisibilityFilter,
                  images: {
                    some: {},
                  },
                },
              },
            },
          ],
        },
        select: {
          normalizedName: true,
          ahsListing: {
            select: cultivarAhsListingSelect,
          },
          listings: {
            where: {
              ...publicListingVisibilityFilter,
              images: {
                some: {},
              },
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 1,
            select: {
              images: {
                select: {
                  url: true,
                },
                orderBy: {
                  order: "asc",
                },
                take: 1,
              },
            },
          },
        },
        take: 24,
      })
    : [];

  const relatedCultivars = relatedByHybridizer
    .map((relatedCultivar) => {
      const segment = toCultivarRouteSegment(relatedCultivar.normalizedName);
      const listing = relatedCultivar.listings[0];
      const imageUrl =
        relatedCultivar.ahsListing?.ahsImageUrl ??
        listing?.images[0]?.url ??
        null;

      if (!segment || !imageUrl) {
        return null;
      }

      return {
        segment,
        normalizedName: relatedCultivar.normalizedName,
        name:
          relatedCultivar.ahsListing?.name ??
          relatedCultivar.normalizedName ??
          "Unknown Cultivar",
        hybridizer: relatedCultivar.ahsListing?.hybridizer ?? null,
        year: relatedCultivar.ahsListing?.year ?? null,
        imageUrl,
        ahsListing: relatedCultivar.ahsListing,
      };
    })
    .filter((cultivar): cultivar is NonNullable<typeof cultivar> =>
      Boolean(cultivar),
    )
    .sort((a, b) => {
      const yearA = getSortableYear(a.year);
      const yearB = getSortableYear(b.year);

      if (yearA !== yearB) {
        return yearB - yearA;
      }

      return a.name.localeCompare(b.name);
    })
    .slice(0, 12);

  const cultivarName = getCultivarDisplayName(
    cultivarReference.normalizedName,
    cultivarReference.ahsListing,
  );

  const offerUpdatedAt = getMaxDate(allOffers.map((offer) => offer.updatedAt));
  const photoUpdatedAt = getMaxDate(
    gardenPhotos.map((photo) => photo.updatedAt),
  );

  return {
    cultivar: {
      id: cultivarReference.id,
      normalizedName: cultivarReference.normalizedName,
      ahsListing: cultivarReference.ahsListing,
    },
    heroImages,
    summary: {
      name: cultivarName,
      hybridizer: cultivarReference.ahsListing?.hybridizer ?? null,
      year: cultivarReference.ahsListing?.year ?? null,
      traitChips: getCultivarTraitChips(cultivarReference.ahsListing),
      gardensCount,
      offersCount,
    },
    quickSpecs: {
      top: allSpecs.top,
      all: allSpecs.all,
    },
    gardenPhotos,
    offers: {
      summary: {
        gardensCount,
        offersCount,
        forSaleCount,
        minPrice: prices.length > 0 ? Math.min(...prices) : null,
        maxPrice: prices.length > 0 ? Math.max(...prices) : null,
      },
      gardenCards,
    },
    relatedByHybridizer: relatedCultivars,
    freshness: {
      cultivarUpdatedAt: cultivarReference.updatedAt,
      offersUpdatedAt: offerUpdatedAt ?? null,
      photosUpdatedAt: photoUpdatedAt ?? null,
    },
  };
}
