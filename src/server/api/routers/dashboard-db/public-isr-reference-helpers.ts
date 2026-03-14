import type { PrismaClient } from "@prisma/client";
import type { PublicInvalidationReference } from "@/types/public-types";

export function catalogsIndexRef(): PublicInvalidationReference {
  return {
    referenceId: "index",
    referenceType: "catalogs:index",
  };
}

export function cultivarRef(
  cultivarSegmentOrName: string | null | undefined,
): PublicInvalidationReference[] {
  return cultivarSegmentOrName
    ? [
        {
          referenceId: cultivarSegmentOrName,
          referenceType: "cultivar",
        },
      ]
    : [];
}

export function listingRef(listingId: string): PublicInvalidationReference {
  return {
    referenceId: listingId,
    referenceType: "listing",
  };
}

export function sellerRef(userId: string): PublicInvalidationReference {
  return {
    referenceId: userId,
    referenceType: "seller",
  };
}

export function buildSellerMutationRefs(
  userId: string,
): PublicInvalidationReference[] {
  return [sellerRef(userId)];
}

export function buildProfileMutationRefs(
  userId: string,
): PublicInvalidationReference[] {
  return [sellerRef(userId), catalogsIndexRef()];
}

export function buildListingUpdateRefs(
  args: {
    listingId: string;
    userId?: string;
    includeCatalogsIndex?: boolean;
  },
): PublicInvalidationReference[] {
  return [
    listingRef(args.listingId),
    ...(args.userId ? [sellerRef(args.userId)] : []),
    ...(args.includeCatalogsIndex ? [catalogsIndexRef()] : []),
  ];
}

export function buildListingCreateOrDeleteRefs(args: {
  cultivarSegmentOrName?: string | null;
  userId: string;
}): PublicInvalidationReference[] {
  return [
    sellerRef(args.userId),
    catalogsIndexRef(),
    ...cultivarRef(args.cultivarSegmentOrName),
  ];
}

export function buildListingRelationshipRefs(args: {
  currentListingId: string;
  relatedCultivarSegmentOrNames?: Array<string | null | undefined>;
}): PublicInvalidationReference[] {
  const relatedCultivars = args.relatedCultivarSegmentOrNames ?? [];

  return [
    listingRef(args.currentListingId),
    ...relatedCultivars.flatMap((segmentOrName) =>
      cultivarRef(segmentOrName),
    ),
  ];
}

export function buildListingImageMutationRefs(
  listingId: string,
): PublicInvalidationReference[] {
  return [listingRef(listingId)];
}

export function buildProfileImageMutationRefs(
  userId: string,
): PublicInvalidationReference[] {
  return buildProfileMutationRefs(userId);
}

export function buildListMembershipMutationRefs(args: {
  listingId: string;
  userId: string;
}): PublicInvalidationReference[] {
  return [sellerRef(args.userId), listingRef(args.listingId)];
}

export function buildListUpdateRefs(args: {
  listingIds: string[];
  userId: string;
}): PublicInvalidationReference[] {
  return [
    sellerRef(args.userId),
    ...args.listingIds.map((listingId) => listingRef(listingId)),
  ];
}

export async function getSellerCultivarMutationRefs(args: {
  db: PrismaClient;
  userId: string;
}): Promise<PublicInvalidationReference[]> {
  const listings = await args.db.listing.findMany({
    where: {
      userId: args.userId,
      cultivarReference: {
        normalizedName: {
          not: null,
        },
      },
    },
    select: {
      cultivarReference: {
        select: {
          normalizedName: true,
        },
      },
    },
  });

  return listings.flatMap((listing) =>
    cultivarRef(listing.cultivarReference?.normalizedName),
  );
}
