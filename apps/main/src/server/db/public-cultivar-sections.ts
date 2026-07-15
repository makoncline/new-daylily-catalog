import {
  type CultivarAhsListing,
  type CultivarListingCards,
  type CultivarSummariesByUserId,
  type PublicCultivarContext,
  type PublicCultivarReferenceData,
} from "@/server/db/public-cultivar-context";
import {
  v2AhsCultivarDisplaySelect,
  withResolvedDisplayAhsListing,
} from "@/lib/utils/ahs-display";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { replicaDb } from "@/server/db";
import { getCloudflareUrlForDaylilyS3Image } from "@/lib/utils/cloudflareLoader";
import type { ImageAssetView } from "@/server/services/image-asset-read-model";
import {
  generatedCultivarImageAssetInclude,
  resolveCultivarReferenceImage,
  shouldQueryGeneratedCultivarImageAssets,
} from "@/server/services/cultivar-reference-image-read-model";

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

type PublicRelatedCultivar = {
  ahsListing: CultivarAhsListing | null;
  hybridizer: string | null;
  imageUrl: string;
  name: string;
  normalizedName: string | null;
  segment: string;
  year: string | null;
};

type PublicCultivarImage = {
  id: string;
  url: string;
  imageAsset?: ImageAssetView;
};

type CultivarListingCardImage = CultivarListingCards[number]["images"][number];

function toRelatedCultivars(
  relatedByHybridizer: Array<{
    normalizedName: string | null;
    ahsListing: CultivarAhsListing | null;
    imageUrl: string | null;
  }>,
): PublicRelatedCultivar[] {
  return relatedByHybridizer
    .flatMap((relatedCultivar) => {
      const segment = toCultivarRouteSegment(relatedCultivar.normalizedName);
      const imageUrl = relatedCultivar.imageUrl;

      if (!segment || !imageUrl) {
        return [];
      }

      return [
        {
          ahsListing: relatedCultivar.ahsListing,
          hybridizer: relatedCultivar.ahsListing?.hybridizer ?? null,
          imageUrl,
          name: getCultivarDisplayName(
            relatedCultivar.normalizedName,
            relatedCultivar.ahsListing,
          ),
          normalizedName: relatedCultivar.normalizedName,
          segment,
          year: relatedCultivar.ahsListing?.year ?? null,
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function toPublicCultivarImage(
  image: CultivarListingCardImage,
): PublicCultivarImage & CultivarListingCardImage {
  return {
    ...image,
    url: image.imageAsset
      ? image.url
      : getCloudflareUrlForDaylilyS3Image(image.url),
  };
}

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

  return {
    all,
    top: all.filter((spec) => TOP_QUICK_SPEC_LABELS.has(spec.label)),
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

function getCultivarHeroImages(
  cultivarReference: PublicCultivarReferenceData["cultivarReference"],
  listingCards: CultivarListingCards,
) {
  const catalogImages = listingCards.flatMap((listing) =>
    listing.images
      .filter((image) => image.id !== `ahs-${listing.id}`)
      .map((image) => {
        const publicImage = toPublicCultivarImage(image);

        return {
          ...publicImage,
          alt: `${listing.title} catalog image`,
          listingId: listing.id,
          sellerSlug: listing.userSlug,
          sellerTitle: listing.sellerTitle,
          source: "catalog" as const,
        };
      }),
  );
  const cultivarReferenceImage = resolveCultivarReferenceImage({
    id: cultivarReference.ahsListing?.id
      ? `ahs-${cultivarReference.ahsListing.id}`
      : `cultivar-reference-${cultivarReference.id}`,
    fallbackImageUrl: cultivarReference.ahsListing?.ahsImageUrl,
    imageAssets: cultivarReference.imageAssets,
  });

  return cultivarReferenceImage
    ? [
        ...catalogImages.slice(0, 11),
        {
          ...cultivarReferenceImage,
          alt: cultivarReference.ahsListing?.name
            ? `${cultivarReference.ahsListing.name} AHS image`
            : "AHS cultivar image",
          listingId: null,
          sellerSlug: null,
          sellerTitle: null,
          source: "ahs" as const,
        },
      ]
    : catalogImages.slice(0, 12);
}

function toGardenCards(args: {
  listingCards: CultivarListingCards;
  summariesByUserId: CultivarSummariesByUserId;
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
      profileImages: PublicCultivarImage[];
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
        previewImage?: PublicCultivarImage | null;
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

    const previewImage = listing.images[0]
      ? toPublicCultivarImage(listing.images[0])
      : null;

    gardenCard.offers.push({
      description: listing.description,
      id: listing.id,
      imageCount: listing.images.length,
      lists: listing.lists,
      previewImage,
      previewImageUrl: previewImage?.url ?? null,
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
  listingCards: CultivarListingCards;
  summariesByUserId: CultivarSummariesByUserId;
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
        maxPrice: prices.length > 0 ? Math.max(...prices) : null,
        minPrice: prices.length > 0 ? Math.min(...prices) : null,
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
  listingCards: CultivarListingCards;
  summariesByUserId: CultivarSummariesByUserId;
}) {
  return args.listingCards
    .flatMap((listing) => {
      const summary = args.summariesByUserId.get(listing.userId);
      if (!summary) {
        return [];
      }

      return listing.images.map((image) => {
        const publicImage = toPublicCultivarImage(image);

        return {
          ...publicImage,
          listingId: listing.id,
          listingTitle: listing.title,
          sellerSlug: summary.slug ?? summary.id,
          sellerTitle: summary.title ?? summary.slug ?? "Unnamed Garden",
          updatedAt: image.updatedAt,
        };
      });
    })
    .sort((a, b) => {
      const aUpdatedAt = toDate(a.updatedAt);
      const bUpdatedAt = toDate(b.updatedAt);

      return (bUpdatedAt?.getTime() ?? 0) - (aUpdatedAt?.getTime() ?? 0);
    })
    .slice(0, 12);
}

export function buildPublicCultivarGardenPhotosFromListingCards(args: {
  listingCards: CultivarListingCards;
  summariesByUserId: CultivarSummariesByUserId;
}) {
  const gardenPhotos = toGardenPhotos(args);

  return {
    freshness: {
      photosUpdatedAt:
        getMaxDate(gardenPhotos.map((photo) => photo.updatedAt)) ?? null,
    },
    gardenPhotos,
  };
}

export async function buildPublicCultivarSummary(args: PublicCultivarContext) {
  const { cultivarReference } = args.referenceData;
  const userIds = Array.from(
    new Set(args.listingCards.map((listing) => listing.userId)),
  );
  const allSpecs = getCultivarSpecs(cultivarReference.ahsListing);
  const gardensCount = userIds.length;
  const offersCount = args.listingCards.length;
  const primaryHybridizerId =
    cultivarReference.v2AhsCultivar?.primary_hybridizer_id?.trim();
  const primaryHybridizer =
    cultivarReference.v2AhsCultivar?.primary_hybridizer_name?.trim();
  const legacyHybridizer =
    cultivarReference.v2AhsCultivar?.hybridizer_code_legacy?.trim();
  const hybridizerIdentifiers = [
    ...(primaryHybridizerId
      ? [{ primary_hybridizer_id: primaryHybridizerId }]
      : []),
    ...(primaryHybridizer
      ? [{ primary_hybridizer_name: primaryHybridizer }]
      : []),
    ...(legacyHybridizer
      ? [{ hybridizer_code_legacy: legacyHybridizer }]
      : []),
  ];
  const generatedCultivarImagesEnabled =
    shouldQueryGeneratedCultivarImageAssets();
  const relatedByHybridizer = hybridizerIdentifiers.length
    ? (
        await replicaDb.v2AhsCultivar.findMany({
          where: {
            OR: hybridizerIdentifiers,
            AND: generatedCultivarImagesEnabled
              ? [
                  {
                    OR: [
                      { image_url: { not: null } },
                      {
                        cultivarReference: {
                          is: {
                            imageAssets: {
                              some: {
                                kind: "cultivar",
                                status: "ready",
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                ]
              : [{ image_url: { not: null } }],
            cultivarReference: {
              is: {
                id: {
                  not: cultivarReference.id,
                },
                normalizedName: {
                  not: null,
                },
              },
            },
          },
          select: {
            ...v2AhsCultivarDisplaySelect,
            cultivarReference: {
              select: {
                id: true,
                normalizedName: true,
                ...(generatedCultivarImagesEnabled
                  ? { imageAssets: generatedCultivarImageAssetInclude }
                  : {}),
              },
            },
          },
          orderBy: {
            cultivarReference: {
              normalizedName: "asc",
            },
          },
          take: RELATED_CULTIVAR_LIMIT,
        })
      ).map((row) => {
        const resolvedCultivar = withResolvedDisplayAhsListing({
          normalizedName: row.cultivarReference?.normalizedName ?? null,
          v2AhsCultivar: row,
        });
        const image = resolveCultivarReferenceImage({
          id: row.cultivarReference?.id ?? row.id,
          fallbackImageUrl: row.image_url,
          imageAssets: row.cultivarReference?.imageAssets,
        });

        return {
          ...resolvedCultivar,
          imageUrl: image?.url ?? null,
        };
      })
    : [];

  const cultivarName = getCultivarDisplayName(
    cultivarReference.normalizedName,
    cultivarReference.ahsListing,
  );

  return {
    cultivar: {
      ahsListing: cultivarReference.ahsListing,
      id: cultivarReference.id,
      normalizedName: cultivarReference.normalizedName,
    },
    freshness: {
      cultivarUpdatedAt: cultivarReference.updatedAt,
    },
    heroImages: getCultivarHeroImages(cultivarReference, args.listingCards),
    quickSpecs: {
      all: allSpecs.all,
      top: allSpecs.top,
    },
    relatedByHybridizer: toRelatedCultivars(relatedByHybridizer),
    summary: {
      gardensCount,
      hybridizer: cultivarReference.ahsListing?.hybridizer ?? null,
      name: cultivarName,
      offersCount,
      traitChips: getCultivarTraitChips(cultivarReference.ahsListing),
      year: cultivarReference.ahsListing?.year ?? null,
    },
  };
}

export async function buildPublicCultivarOffers(args: PublicCultivarContext) {
  return buildPublicCultivarOffersFromListingCards(args);
}

export async function buildPublicCultivarGardenPhotos(
  args: PublicCultivarContext,
) {
  return buildPublicCultivarGardenPhotosFromListingCards(args);
}

export function buildPublicCultivarPage(args: {
  summarySection: Awaited<ReturnType<typeof buildPublicCultivarSummary>>;
  offersSection: Awaited<ReturnType<typeof buildPublicCultivarOffers>>;
  photosSection: Awaited<ReturnType<typeof buildPublicCultivarGardenPhotos>>;
}) {
  return {
    ...args.summarySection,
    freshness: {
      cultivarUpdatedAt: args.summarySection.freshness.cultivarUpdatedAt,
      offersUpdatedAt: args.offersSection.freshness.offersUpdatedAt,
      photosUpdatedAt: args.photosSection.freshness.photosUpdatedAt,
    },
    gardenPhotos: args.photosSection.gardenPhotos,
    offers: args.offersSection.offers,
  };
}
