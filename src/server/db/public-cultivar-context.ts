import {
  getCultivarRouteCandidates,
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

export const cultivarAhsListingSelect = {
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

export interface CultivarAhsListing {
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
}

export interface PublicCultivarReferenceRecord {
  id: string;
  normalizedName: string | null;
  updatedAt: Date;
  ahsListing: CultivarAhsListing | null;
}

export interface PublicCultivarReferenceData {
  canonicalSegment: string;
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
): Promise<PublicCultivarReferenceRecord | null> {
  const uniqueNormalizedNames = Array.from(
    new Set(
      normalizedNames.filter((normalizedName) => normalizedName.length > 0),
    ),
  );

  if (uniqueNormalizedNames.length === 0) {
    return null;
  }

  return db.cultivarReference.findFirst({
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

