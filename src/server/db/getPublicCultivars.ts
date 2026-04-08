import { isV2CultivarDisplayDataEnabled } from "@/config/feature-flags";
import {
  ahsDisplayAhsListingSelect,
  type AhsDisplayListing,
  v2AhsCultivarDisplaySelect,
  withResolvedDisplayAhsListing,
} from "@/lib/utils/ahs-display";
import {
  getCultivarRouteCandidates,
  toCultivarRouteSegment,
} from "@/lib/utils/cultivar-utils";
import { db } from "@/server/db";
import { getCachedProUserIds } from "@/server/db/getCachedProUserIds";
import { getPublicListingCardsByIds } from "@/server/db/getPublicListings";
import { getPublicSellerSummariesByUserIds } from "@/server/db/public-seller-data";
import {
  shouldShowToPublic,
} from "@/server/db/public-visibility/filters";

const getCultivarReferenceLookupWhereClause = () => ({
  normalizedName: {
    not: null,
  },
});

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

const RELATED_CULTIVAR_LIMIT = 5;

type CultivarAhsListing = AhsDisplayListing;

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

function toDate(value: Date | string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function getMaxDate(
  dates: Array<Date | string | null | undefined>,
): Date | undefined {
  return dates.reduce<Date | undefined>((latest, value) => {
    const nextValue = toDate(value);

    if (!nextValue) {
      return latest;
    }

    if (!latest || nextValue.getTime() > latest.getTime()) {
      return nextValue;
    }

    return latest;
  }, undefined);
}

function getBestMatchScore(offer: {
  price: number | null;
  imageCount: number;
  updatedAt: Date | string;
}) {
  const updatedAt = toDate(offer.updatedAt);
  return {
    forSale: offer.price !== null ? 1 : 0,
    imageCount: offer.imageCount,
    updatedAt: updatedAt?.getTime() ?? 0,
  };
}

function sortOffersBestMatch(
  a: {
    price: number | null;
    imageCount: number;
    updatedAt: Date | string;
    title: string;
  },
  b: {
    price: number | null;
    imageCount: number;
    updatedAt: Date | string;
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
  const uniqueNormalizedNames = Array.from(
    new Set(
      normalizedNames.filter((normalizedName) => normalizedName.length > 0),
    ),
  );

  if (uniqueNormalizedNames.length === 0) {
    return null;
  }

  const row = await db.cultivarReference.findFirst({
    where: {
      AND: [
        getCultivarReferenceLookupWhereClause(),
        {
          normalizedName: {
            in: uniqueNormalizedNames,
          },
        },
      ],
    },
    select: {
      id: true,
      normalizedName: true,
      updatedAt: true,
      ahsListing: {
        select: ahsDisplayAhsListingSelect,
      },
      v2AhsCultivar: {
        select: v2AhsCultivarDisplaySelect,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return row ? withResolvedDisplayAhsListing(row) : null;
}

export async function getCultivarRouteSegments(): Promise<string[]> {
  const cultivars = await db.cultivarReference.findMany({
    where: getCultivarReferenceLookupWhereClause(),
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
  const proUserIds = await getCachedProUserIds();

  if (proUserIds.length === 0) {
    return [];
  }

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

  const listingRows = await db.listing.findMany({
    where: {
      cultivarReferenceId: {
        not: null,
      },
      ...shouldShowToPublic(proUserIds),
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

async function getPublicCultivarReference(cultivarSegment: string) {
  const canonicalSegment = toCultivarRouteSegment(cultivarSegment);
  if (!canonicalSegment) {
    return null;
  }

  const proUserIds = await getCachedProUserIds();

  const normalizedCultivarNames = getCultivarRouteCandidates(cultivarSegment);

  let cultivarReference = await findCultivarReferenceByNormalizedNames(
    normalizedCultivarNames,
  );

  if (!cultivarReference) {
    const normalizedNamesFromSlug =
      await getCultivarNormalizedNamesForSegment(canonicalSegment);

    cultivarReference = await findCultivarReferenceByNormalizedNames(
      normalizedNamesFromSlug,
    );
  }

  if (!cultivarReference) {
    return null;
  }

  return {
    canonicalSegment,
    cultivarReference,
    proUserIds,
  };
}

async function getCultivarListingIds(args: {
  cultivarReferenceId: string;
  proUserIds: string[];
}) {
  return db.listing.findMany({
    where: {
      cultivarReferenceId: args.cultivarReferenceId,
      ...shouldShowToPublic(args.proUserIds),
    },
    select: {
      id: true,
    },
    orderBy: [{ title: "asc" }, { id: "asc" }],
  });
}

export async function getPublicCultivarListingIds(
  cultivarSegment: string,
): Promise<string[] | null> {
  const referenceData = await getPublicCultivarReference(cultivarSegment);
  if (!referenceData) {
    return null;
  }

  const rows = await getCultivarListingIds({
    cultivarReferenceId: referenceData.cultivarReference.id,
    proUserIds: referenceData.proUserIds,
  });

  return rows.map((row) => row.id);
}

function getCultivarUserIds(
  listingCards: Awaited<ReturnType<typeof getCultivarListingCards>>,
) {
  return Array.from(new Set(listingCards.map((listing) => listing.userId)));
}

async function getSellerSummariesForCultivarListings(
  listingCards: Awaited<ReturnType<typeof getCultivarListingCards>>,
  activeUserIds: readonly string[],
) {
  return getPublicSellerSummariesByUserIds(getCultivarUserIds(listingCards), {
    activeUserIds,
  });
}

async function getCultivarListingCards(args: {
  cultivarReferenceId: string;
  proUserIds: string[];
}) {
  const ids = await getCultivarListingIds(args);
  return getPublicListingCardsByIds(ids.map((row) => row.id));
}

interface PublicCultivarContext {
  listingCards: Awaited<ReturnType<typeof getCultivarListingCards>>;
  referenceData: NonNullable<
    Awaited<ReturnType<typeof getPublicCultivarReference>>
  >;
  summariesByUserId: Awaited<ReturnType<typeof getSellerSummariesForCultivarListings>>;
}

async function loadPublicCultivarContext(
  cultivarSegment: string,
): Promise<PublicCultivarContext | null> {
  const referenceData = await getPublicCultivarReference(cultivarSegment);
  if (!referenceData) {
    return null;
  }

  const listingCards = await getCultivarListingCards({
    cultivarReferenceId: referenceData.cultivarReference.id,
    proUserIds: referenceData.proUserIds,
  });
  const summariesByUserId = await getSellerSummariesForCultivarListings(
    listingCards,
    referenceData.proUserIds,
  );

  return {
    listingCards,
    referenceData,
    summariesByUserId,
  };
}

function getCultivarHeroImages(
  cultivarReference: NonNullable<
    Awaited<ReturnType<typeof getPublicCultivarReference>>
  >["cultivarReference"],
) {
  return cultivarReference.ahsListing?.ahsImageUrl
    ? [
        {
          alt: cultivarReference.ahsListing.name
            ? `${cultivarReference.ahsListing.name} AHS image`
            : "AHS cultivar image",
          id: `ahs-${cultivarReference.ahsListing.legacyAhsId ?? cultivarReference.ahsListing.id}`,
          listingId: null,
          sellerSlug: null,
          sellerTitle: null,
          source: "ahs" as const,
          url: cultivarReference.ahsListing.ahsImageUrl,
        },
      ]
    : [];
}

function toRelatedCultivars(
  relatedByHybridizer: Array<{
    normalizedName: string | null;
    ahsListing: CultivarAhsListing | null;
  }>,
) {
  return relatedByHybridizer
    .map((relatedCultivar) => {
      const segment = toCultivarRouteSegment(relatedCultivar.normalizedName);
      const imageUrl = relatedCultivar.ahsListing?.ahsImageUrl ?? null;

      if (!segment || !imageUrl) {
        return null;
      }

      return {
        ahsListing: relatedCultivar.ahsListing,
        hybridizer: relatedCultivar.ahsListing?.hybridizer ?? null,
        imageUrl,
        name:
          relatedCultivar.ahsListing?.name ??
          relatedCultivar.normalizedName ??
          "Unknown Cultivar",
        normalizedName: relatedCultivar.normalizedName,
        segment,
        year: relatedCultivar.ahsListing?.year ?? null,
      };
    })
    .filter((cultivar): cultivar is NonNullable<typeof cultivar> =>
      Boolean(cultivar),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, RELATED_CULTIVAR_LIMIT);
}

function toGardenCards(args: {
  listingCards: Awaited<ReturnType<typeof getCultivarListingCards>>;
  summariesByUserId: Awaited<
    ReturnType<typeof getSellerSummariesForCultivarListings>
  >;
}) {
  const gardenCardsMap = new Map<
    string,
    {
      userId: string;
      slug: string;
      title: string;
      description: string | null;
      location: string | null;
      listingCount: number;
      listCount: number;
      profileImages: Array<{ id: string; url: string }>;
      createdAt: Date;
      updatedAt: Date;
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

  args.listingCards.forEach((listing) => {
    const summary = args.summariesByUserId.get(listing.userId);
    if (!summary) {
      return;
    }

    const sellerTitle = summary.title ?? summary.slug ?? "Unnamed Garden";

    if (!gardenCardsMap.has(listing.userId)) {
      gardenCardsMap.set(listing.userId, {
        createdAt: summary.createdAt,
        description: summary.description,
        listCount: summary.listCount,
        listingCount: summary.listingCount,
        location: summary.location,
        offers: [],
        profileImages: summary.images.slice(0, 1),
        slug: summary.slug ?? summary.id,
        title: sellerTitle,
        updatedAt: summary.updatedAt,
        userId: summary.id,
      });
    }

    const gardenCard = gardenCardsMap.get(listing.userId);
    if (!gardenCard) {
      return;
    }

    gardenCard.offers.push({
      description: listing.description,
      id: listing.id,
      imageCount: listing.images.length,
      lists: listing.lists,
      previewImageUrl: listing.images[0]?.url ?? null,
      price: listing.price,
      slug: listing.slug,
      title: listing.title,
      updatedAt: listing.updatedAt,
    });
  });

  return Array.from(gardenCardsMap.values())
    .map((gardenCard) => ({
      ...gardenCard,
      offers: gardenCard.offers.sort(sortOffersBestMatch),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function buildPublicCultivarOffersFromListingCards(args: {
  listingCards: Awaited<ReturnType<typeof getCultivarListingCards>>;
  summariesByUserId: Awaited<
    ReturnType<typeof getSellerSummariesForCultivarListings>
  >;
}) {
  const gardenCards = toGardenCards(args);
  const allOffers = gardenCards.flatMap((gardenCard) => gardenCard.offers);
  const prices = allOffers
    .map((offer) => offer.price)
    .filter((price): price is number => price !== null);

  return {
    offers: {
      summary: {
        gardensCount: gardenCards.length,
        offersCount: allOffers.length,
        forSaleCount: allOffers.filter((offer) => offer.price !== null).length,
        minPrice: prices.length > 0 ? Math.min(...prices) : null,
        maxPrice: prices.length > 0 ? Math.max(...prices) : null,
      },
      gardenCards,
    },
    freshness: {
      offersUpdatedAt:
        getMaxDate(allOffers.map((offer) => offer.updatedAt)) ?? null,
    },
  };
}

function toGardenPhotos(args: {
  listingCards: Awaited<ReturnType<typeof getCultivarListingCards>>;
  summariesByUserId: Awaited<
    ReturnType<typeof getSellerSummariesForCultivarListings>
  >;
}) {
  return args.listingCards
    .flatMap((listing) => {
      const summary = args.summariesByUserId.get(listing.userId);
      if (!summary) {
        return [];
      }

      return listing.images.map((image) => ({
        id: image.id,
        listingId: listing.id,
        listingTitle: listing.title,
        sellerSlug: summary.slug ?? summary.id,
        sellerTitle: summary.title ?? summary.slug ?? "Unnamed Garden",
        updatedAt: image.updatedAt,
        url: image.url,
      }));
    })
    .sort((a, b) => {
      const aUpdatedAt = toDate(a.updatedAt);
      const bUpdatedAt = toDate(b.updatedAt);

      return (bUpdatedAt?.getTime() ?? 0) - (aUpdatedAt?.getTime() ?? 0);
    })
    .slice(0, 12);
}

export function buildPublicCultivarGardenPhotosFromListingCards(args: {
  listingCards: Awaited<ReturnType<typeof getCultivarListingCards>>;
  summariesByUserId: Awaited<
    ReturnType<typeof getSellerSummariesForCultivarListings>
  >;
}) {
  const gardenPhotos = toGardenPhotos(args);

  return {
    gardenPhotos,
    freshness: {
      photosUpdatedAt:
        getMaxDate(gardenPhotos.map((photo) => photo.updatedAt)) ?? null,
    },
  };
}

async function buildPublicCultivarSummary(args: {
  referenceData: NonNullable<
    Awaited<ReturnType<typeof getPublicCultivarReference>>
  >;
  listingCards: Awaited<ReturnType<typeof getCultivarListingCards>>;
}) {
  const { cultivarReference } = args.referenceData;
  const listingCards = args.listingCards;
  const userIds = Array.from(
    new Set(listingCards.map((listing) => listing.userId)),
  );
  const allSpecs = getCultivarSpecs(cultivarReference.ahsListing);
  const gardensCount = userIds.length;
  const offersCount = listingCards.length;
  const shouldUseV2HybridizerLookup =
    isV2CultivarDisplayDataEnabled() &&
    Boolean(cultivarReference.v2AhsCultivar?.primary_hybridizer_name);
  const relatedByHybridizer = cultivarReference.ahsListing?.hybridizer
    ? (
        await db.cultivarReference.findMany({
          where: {
            id: {
              not: cultivarReference.id,
            },
            ...getCultivarReferenceLookupWhereClause(),
            ...(shouldUseV2HybridizerLookup
              ? {
                  OR: [
                    {
                      v2AhsCultivar: {
                        is: {
                          primary_hybridizer_name:
                            cultivarReference.v2AhsCultivar
                              ?.primary_hybridizer_name ?? null,
                          image_url: {
                            not: null,
                          },
                        },
                      },
                    },
                    {
                      v2AhsCultivarId: null,
                      ahsListing: {
                        is: {
                          hybridizer: cultivarReference.ahsListing.hybridizer,
                          ahsImageUrl: {
                            not: null,
                          },
                        },
                      },
                    },
                  ],
                }
              : {
                  ahsListing: {
                    is: {
                      hybridizer: cultivarReference.ahsListing.hybridizer,
                      ahsImageUrl: {
                        not: null,
                      },
                    },
                  },
                }),
          },
          select: {
            normalizedName: true,
            ahsListing: {
              select: ahsDisplayAhsListingSelect,
            },
            v2AhsCultivar: {
              select: v2AhsCultivarDisplaySelect,
            },
          },
          orderBy: {
            normalizedName: "asc",
          },
          take: RELATED_CULTIVAR_LIMIT,
        })
      ).map((row) => withResolvedDisplayAhsListing(row))
    : [];

  const cultivarName = getCultivarDisplayName(
    cultivarReference.normalizedName,
    cultivarReference.ahsListing,
  );

  return {
    cultivar: {
      id: cultivarReference.id,
      normalizedName: cultivarReference.normalizedName,
      ahsListing: cultivarReference.ahsListing,
    },
    heroImages: getCultivarHeroImages(cultivarReference),
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
    relatedByHybridizer: toRelatedCultivars(relatedByHybridizer),
    freshness: {
      cultivarUpdatedAt: cultivarReference.updatedAt,
    },
  };
}

async function buildPublicCultivarOffers(args: {
  listingCards: Awaited<ReturnType<typeof getCultivarListingCards>>;
  summariesByUserId: Awaited<
    ReturnType<typeof getSellerSummariesForCultivarListings>
  >;
}) {
  return buildPublicCultivarOffersFromListingCards(args);
}

async function buildPublicCultivarGardenPhotos(args: {
  listingCards: Awaited<ReturnType<typeof getCultivarListingCards>>;
  summariesByUserId: Awaited<
    ReturnType<typeof getSellerSummariesForCultivarListings>
  >;
}) {
  return buildPublicCultivarGardenPhotosFromListingCards(args);
}

export async function getPublicCultivarPage(cultivarSegment: string) {
  const context = await loadPublicCultivarContext(cultivarSegment);
  if (!context) {
    return null;
  }

  const [summarySection, offersSection, photosSection] = await Promise.all([
    buildPublicCultivarSummary(context),
    buildPublicCultivarOffers(context),
    buildPublicCultivarGardenPhotos(context),
  ]);

  return {
    ...summarySection,
    gardenPhotos: photosSection.gardenPhotos,
    offers: offersSection.offers,
    freshness: {
      cultivarUpdatedAt: summarySection.freshness.cultivarUpdatedAt,
      offersUpdatedAt: offersSection.freshness.offersUpdatedAt,
      photosUpdatedAt: photosSection.freshness.photosUpdatedAt,
    },
  };
}

export async function getPublicCultivarSummary(cultivarSegment: string) {
  const context = await loadPublicCultivarContext(cultivarSegment);
  if (!context) {
    return null;
  }

  return buildPublicCultivarSummary(context);
}

export async function getPublicCultivarOffers(cultivarSegment: string) {
  const context = await loadPublicCultivarContext(cultivarSegment);
  if (!context) {
    return null;
  }

  return buildPublicCultivarOffers(context);
}

export async function getPublicCultivarGardenPhotos(cultivarSegment: string) {
  const context = await loadPublicCultivarContext(cultivarSegment);
  if (!context) {
    return null;
  }

  return buildPublicCultivarGardenPhotos(context);
}
