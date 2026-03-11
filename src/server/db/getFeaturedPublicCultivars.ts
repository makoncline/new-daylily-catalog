import { db } from "@/server/db";
import { getCachedProUserIds } from "@/server/db/getCachedProUserIds";
import { shouldShowToPublic } from "@/server/db/public-visibility/filters";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import type { HomeFeaturedCultivar } from "@/types";

interface GetFeaturedPublicCultivarsOptions {
  limit?: number;
}

const FEATURED_CULTIVAR_MULTIPLIER = 3;

export async function getFeaturedPublicCultivars(
  options?: GetFeaturedPublicCultivarsOptions,
): Promise<HomeFeaturedCultivar[]> {
  const limit = options?.limit ?? 4;
  const proUserIds = await getCachedProUserIds();

  if (proUserIds.length === 0) {
    return [];
  }

  const groupedListings = await db.listing.groupBy({
    by: ["cultivarReferenceId"],
    where: {
      ...shouldShowToPublic(proUserIds),
      cultivarReferenceId: {
        not: null,
      },
    },
    _count: {
      cultivarReferenceId: true,
    },
    orderBy: {
      _count: {
        cultivarReferenceId: "desc",
      },
    },
    take: limit * FEATURED_CULTIVAR_MULTIPLIER,
  });

  const cultivarReferenceIds = groupedListings.flatMap((group) =>
    group.cultivarReferenceId ? [group.cultivarReferenceId] : [],
  );

  if (cultivarReferenceIds.length === 0) {
    return [];
  }

  const cultivars = await db.cultivarReference.findMany({
    where: {
      id: {
        in: cultivarReferenceIds,
      },
    },
    select: {
      id: true,
      normalizedName: true,
      ahsListing: {
        select: {
          name: true,
          ahsImageUrl: true,
          hybridizer: true,
          year: true,
        },
      },
    },
  });

  const cultivarById = new Map(
    cultivars.map((cultivar) => [cultivar.id, cultivar]),
  );

  return groupedListings
    .flatMap((group) => {
      if (!group.cultivarReferenceId) {
        return [];
      }

      const cultivar = cultivarById.get(group.cultivarReferenceId);
      const normalizedName = cultivar?.normalizedName ?? null;
      const segment = toCultivarRouteSegment(normalizedName);
      const offerCount = group._count.cultivarReferenceId;

      if (!cultivar || !normalizedName || !segment) {
        return [];
      }

      return [
        {
          id: cultivar.id,
          name: cultivar.ahsListing?.name ?? normalizedName,
          normalizedName,
          segment,
          imageUrl: cultivar.ahsListing?.ahsImageUrl ?? null,
          hybridizer: cultivar.ahsListing?.hybridizer ?? null,
          year: cultivar.ahsListing?.year ?? null,
          offerCount,
        },
      ];
    })
    .slice(0, limit);
}
