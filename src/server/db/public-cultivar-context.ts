import {
  ahsDisplayAhsListingSelect,
  type AhsDisplayListing,
  type V2AhsCultivarDisplaySource,
  v2AhsCultivarDisplaySelect,
  withResolvedDisplayAhsListing,
} from "@/lib/utils/ahs-display";
import {
  fromCultivarRouteSegment,
  toCultivarRouteSegment,
} from "@/lib/utils/cultivar-utils";
import { db } from "@/server/db";
import { getCachedProUserIds } from "@/server/db/getCachedProUserIds";
import { getPublicListingCardsByIds } from "@/server/db/public-listing-read-model";
import { getPublicSellerSummariesByUserIds } from "@/server/db/public-seller-read-model";
import { shouldShowToPublic } from "@/server/db/public-visibility/filters";

export const getCultivarReferenceLookupWhereClause = () => ({
  normalizedName: {
    not: null,
  },
});

export const cultivarAhsListingSelect = ahsDisplayAhsListingSelect;

export type CultivarAhsListing = AhsDisplayListing;

export interface PublicCultivarReferenceRecord {
  id: string;
  normalizedName: string | null;
  updatedAt: Date;
  ahsListing: CultivarAhsListing | null;
  v2AhsCultivar?: V2AhsCultivarDisplaySource | null;
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
  const row = await db.cultivarReference.findFirst({
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
      ahsListing: {
        select: cultivarAhsListingSelect,
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
    const segment = toCultivarRouteSegment(cultivar.normalizedName);
    if (segment) {
      uniqueSegments.add(segment);
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
      segmentMap.set(segment, { segment, lastModified });
      return;
    }

    if (
      lastModified &&
      (!existingSegmentEntry.lastModified ||
        lastModified.getTime() > existingSegmentEntry.lastModified.getTime())
    ) {
      segmentMap.set(segment, { segment, lastModified });
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

async function getPublicCultivarReference(
  cultivarSegment: string,
): Promise<PublicCultivarReferenceData | null> {
  const normalizedCultivarName = fromCultivarRouteSegment(cultivarSegment);
  if (!normalizedCultivarName) {
    return null;
  }

  const proUserIds = await getCachedProUserIds();
  const cultivarReference = await findCultivarReferenceByNormalizedName(
    normalizedCultivarName,
  );

  if (!cultivarReference) {
    return null;
  }

  return {
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
  cultivarReferenceId: string;
  proUserIds: string[];
}): Promise<CultivarListingCards> {
  const ids = await getCultivarListingIds(args);
  return getPublicListingCardsByIds(ids.map((row) => row.id));
}

export async function loadPublicCultivarContext(
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
