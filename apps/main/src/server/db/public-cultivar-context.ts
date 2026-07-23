import {
  type AhsDisplayListing,
  type V2AhsCultivarDisplaySource,
  v2AhsCultivarDisplaySelect,
  withResolvedDisplayAhsListing,
} from "@/lib/utils/ahs-display";
import {
  fromCultivarRouteSegment,
  toCultivarRouteSegment,
} from "@/lib/utils/cultivar-utils";
import { replicaDb } from "@/server/db";
import {
  getActiveProUserIdsForUserIds,
  getProUserIds,
} from "@/server/db/getProUserIds";
import { getPublicListingCardsByIds } from "@/server/db/public-listing-read-model";
import { getPublicSellerSummariesByUserIds } from "@/server/db/public-seller-read-model";
import { generatedCultivarImageAssetInclude } from "@/server/services/cultivar-reference-image-read-model";
import type { ImageAssetUrlRow } from "@/server/services/image-asset-read-model";
import { isPublished } from "@/server/db/public-visibility/filters";

const getCultivarReferenceLookupWhereClause = () => ({
  normalizedName: {
    not: null,
  },
});

export type CultivarAhsListing = AhsDisplayListing;

interface PublicCultivarReferenceRecord {
  id: string;
  normalizedName: string | null;
  updatedAt: Date;
  ahsListing: CultivarAhsListing | null;
  v2AhsCultivar?:
    | (V2AhsCultivarDisplaySource & {
        primary_hybridizer_id?: string | null;
      })
    | null;
  imageAssets?: ImageAssetUrlRow[];
}

export interface PublicCultivarReferenceData {
  cultivarReference: PublicCultivarReferenceRecord;
  proUserIds: string[];
}

export type CultivarListingCards = Awaited<
  ReturnType<typeof getPublicListingCardsByIds>
>;
export type CultivarSummariesByUserId = Awaited<
  ReturnType<typeof getPublicSellerSummariesByUserIds>
>;

export interface PublicCultivarContext {
  listingCards: CultivarListingCards;
  referenceData: PublicCultivarReferenceData;
  summariesByUserId: CultivarSummariesByUserId;
}

async function findCultivarReferenceByNormalizedName(
  normalizedName: string,
): Promise<PublicCultivarReferenceRecord | null> {
  const row = await replicaDb.cultivarReference.findFirst({
    where: {
      AND: [
        getCultivarReferenceLookupWhereClause(),
        {
          normalizedName,
        },
      ],
    },
    select: {
      id: true,
      normalizedName: true,
      updatedAt: true,
      v2AhsCultivar: {
        select: {
          ...v2AhsCultivarDisplaySelect,
          primary_hybridizer_id: true,
        },
      },
      imageAssets: generatedCultivarImageAssetInclude,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return row ? withResolvedDisplayAhsListing(row) : null;
}

const routableCultivarWhere = {
  normalizedName: {
    not: null,
  },
} as const;

export async function getCultivarSitemapEntryCount() {
  return replicaDb.cultivarReference.count({
    where: routableCultivarWhere,
  });
}

export async function getCultivarSitemapEntries(args: {
  page: number;
  pageSize: number;
}): Promise<
  Array<{
    segment: string;
  }>
> {
  const cultivarReferences = await replicaDb.cultivarReference.findMany({
    where: routableCultivarWhere,
    select: {
      normalizedName: true,
    },
    orderBy: {
      normalizedName: "asc",
    },
    skip: args.page * args.pageSize,
    take: args.pageSize,
  });

  return cultivarReferences.flatMap((cultivar) => {
    const segment = toCultivarRouteSegment(cultivar.normalizedName);

    return segment ? [{ segment }] : [];
  });
}

export async function getPublicOfferCultivarSitemapEntries(): Promise<
  Array<{ segment: string }>
> {
  const proUserIds = await getProUserIds();

  if (proUserIds.length === 0) {
    return [];
  }

  const cultivarReferences = await replicaDb.cultivarReference.findMany({
    where: {
      ...routableCultivarWhere,
      listings: {
        some: {
          ...isPublished(),
          userId: {
            in: proUserIds,
          },
        },
      },
    },
    select: {
      normalizedName: true,
    },
    orderBy: {
      normalizedName: "asc",
    },
  });

  return cultivarReferences.flatMap((cultivar) => {
    const segment = toCultivarRouteSegment(cultivar.normalizedName);

    return segment ? [{ segment }] : [];
  });
}

async function getPublicCultivarReference(cultivarSegment: string): Promise<{
  referenceData: PublicCultivarReferenceData;
  listingIds: string[];
} | null> {
  const normalizedCultivarName = fromCultivarRouteSegment(cultivarSegment);
  if (!normalizedCultivarName) {
    return null;
  }

  const cultivarReference = await findCultivarReferenceByNormalizedName(
    normalizedCultivarName,
  );

  if (!cultivarReference) {
    return null;
  }

  const publishedListingRows = await getPublishedCultivarListingRows(
    cultivarReference.id,
  );
  const proUserIds = await getActiveProUserIdsForUserIds(
    publishedListingRows.map((listing) => listing.userId),
  );
  const proUserIdSet = new Set(proUserIds);
  const listingIds = publishedListingRows
    .filter((listing) => proUserIdSet.has(listing.userId))
    .map((listing) => listing.id);

  return {
    referenceData: {
      cultivarReference,
      proUserIds,
    },
    listingIds,
  };
}

async function getPublishedCultivarListingRows(cultivarReferenceId: string) {
  return replicaDb.listing.findMany({
    where: {
      cultivarReferenceId,
      ...isPublished(),
    },
    select: {
      id: true,
      userId: true,
    },
    orderBy: [{ title: "asc" }, { id: "asc" }],
  });
}

function getCultivarUserIds(listingCards: CultivarListingCards) {
  return Array.from(new Set(listingCards.map((listing) => listing.userId)));
}

async function getSellerSummariesForCultivarListings(
  listingCards: CultivarListingCards,
  activeUserIds: readonly string[],
) {
  return getPublicSellerSummariesByUserIds(getCultivarUserIds(listingCards), {
    activeUserIds,
  });
}

async function getCultivarListingCards(args: {
  listingIds: string[];
}): Promise<CultivarListingCards> {
  return getPublicListingCardsByIds(args.listingIds);
}

export async function loadPublicCultivarContext(
  cultivarSegment: string,
): Promise<PublicCultivarContext | null> {
  const contextInput = await getPublicCultivarReference(cultivarSegment);
  if (!contextInput) {
    return null;
  }

  const { referenceData } = contextInput;
  const listingCards = await getCultivarListingCards({
    listingIds: contextInput.listingIds,
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
