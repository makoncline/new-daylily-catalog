import { revalidateTag, unstable_cache } from "next/cache";
import { PUBLIC_CACHE_CONFIG } from "@/config/public-cache-config";
import { getPublicCultivarPage } from "@/server/db/getPublicCultivars";
import { getInitialListings } from "@/server/db/getPublicListings";
import { getPublicProfile } from "@/server/db/getPublicProfile";
import { getPublicProfiles } from "@/server/db/getPublicProfiles";
import { getPublicProfilePageData } from "@/app/(public)/[userSlugOrId]/_lib/public-profile-route";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";

const PUBLIC_CATALOGS_PAGE_REVALIDATE_SECONDS =
  PUBLIC_CACHE_CONFIG.REVALIDATE_SECONDS.PAGE.CATALOGS;
const PUBLIC_PROFILE_PAGE_REVALIDATE_SECONDS =
  PUBLIC_CACHE_CONFIG.REVALIDATE_SECONDS.PAGE.PROFILE;
const PUBLIC_CULTIVAR_PAGE_REVALIDATE_SECONDS =
  PUBLIC_CACHE_CONFIG.REVALIDATE_SECONDS.PAGE.CULTIVAR;

const PUBLIC_PAGE_DATA_CACHE_KEY_PREFIX = "public-page-data";
const PUBLIC_ROUTE_PROFILE_TAG_PREFIX = "public-route:profile";
const PUBLIC_ROUTE_CULTIVAR_TAG_PREFIX = "public-route:cultivar";
const PUBLIC_ROUTE_CATALOGS_TAG = "public-route:catalogs";

function normalizeCultivarSegment(cultivarSegment: string) {
  return toCultivarRouteSegment(cultivarSegment) ?? cultivarSegment;
}

function getPublicCultivarRouteTagFromNormalizedSegment(normalizedSegment: string) {
  return `${PUBLIC_ROUTE_CULTIVAR_TAG_PREFIX}:${normalizedSegment}`;
}

interface PublicCacheInvalidationDb {
  userProfile: {
    findUnique(args: {
      where: { userId: string };
      select: { slug: true };
    }): Promise<{ slug: string | null } | null>;
  };
  cultivarReference: {
    findUnique(args: {
      where: { id: string };
      select: { normalizedName: true };
    }): Promise<{ normalizedName: string | null } | null>;
  };
}

export function getPublicProfileRouteTag(userSlugOrId: string) {
  return `${PUBLIC_ROUTE_PROFILE_TAG_PREFIX}:${userSlugOrId}`;
}

export function getPublicCultivarRouteTag(cultivarSegment: string) {
  const normalizedSegment = normalizeCultivarSegment(cultivarSegment);
  return getPublicCultivarRouteTagFromNormalizedSegment(normalizedSegment);
}

export function invalidatePublicCatalogsRouteCache() {
  revalidateTag(PUBLIC_ROUTE_CATALOGS_TAG, "max");
}

export function invalidatePublicProfileRouteCache(userSlugOrId: string) {
  revalidateTag(getPublicProfileRouteTag(userSlugOrId), "max");
}

export async function invalidatePublicProfileRouteCacheByUserId(
  db: PublicCacheInvalidationDb,
  userId: string,
  additionalRouteKeys: string[] = [],
) {
  const routeKeys = new Set<string>([userId]);

  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: { slug: true },
  });

  if (profile?.slug) {
    routeKeys.add(profile.slug);
  }

  additionalRouteKeys.forEach((key) => {
    if (key) {
      routeKeys.add(key);
    }
  });

  routeKeys.forEach((key) => invalidatePublicProfileRouteCache(key));
}

export function invalidatePublicCultivarRouteCache(cultivarSegment: string) {
  revalidateTag(getPublicCultivarRouteTag(cultivarSegment), "max");
}

export async function invalidatePublicCultivarRouteCachesByCultivarReferenceIds(
  db: PublicCacheInvalidationDb,
  cultivarReferenceIds: Array<string | null | undefined>,
) {
  const uniqueIds = new Set(
    cultivarReferenceIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    ),
  );

  for (const cultivarReferenceId of uniqueIds) {
    const cultivarReference = await db.cultivarReference.findUnique({
      where: { id: cultivarReferenceId },
      select: { normalizedName: true },
    });

    if (!cultivarReference?.normalizedName) {
      continue;
    }

    const segment = toCultivarRouteSegment(cultivarReference.normalizedName);
    if (segment) {
      invalidatePublicCultivarRouteCache(segment);
    }
  }
}

export function getCachedPublicProfiles() {
  return unstable_cache(
    async () => getPublicProfiles(),
    [PUBLIC_PAGE_DATA_CACHE_KEY_PREFIX, "public-profiles"],
    {
      revalidate: PUBLIC_CATALOGS_PAGE_REVALIDATE_SECONDS,
      tags: [PUBLIC_ROUTE_CATALOGS_TAG],
    },
  )();
}

export function getCachedPublicProfile(userSlugOrId: string) {
  return unstable_cache(
    async () => getPublicProfile(userSlugOrId),
    [PUBLIC_PAGE_DATA_CACHE_KEY_PREFIX, "public-profile", userSlugOrId],
    {
      revalidate: PUBLIC_PROFILE_PAGE_REVALIDATE_SECONDS,
      tags: [getPublicProfileRouteTag(userSlugOrId)],
    },
  )();
}

export function getCachedInitialListings(userSlugOrId: string) {
  return unstable_cache(
    async () => getInitialListings(userSlugOrId),
    [PUBLIC_PAGE_DATA_CACHE_KEY_PREFIX, "initial-listings", userSlugOrId],
    {
      revalidate: PUBLIC_PROFILE_PAGE_REVALIDATE_SECONDS,
      tags: [getPublicProfileRouteTag(userSlugOrId)],
    },
  )();
}

export function getCachedPublicProfilePageData(
  userSlugOrId: string,
  page: number,
) {
  return unstable_cache(
    async () => getPublicProfilePageData(userSlugOrId, page),
    [
      PUBLIC_PAGE_DATA_CACHE_KEY_PREFIX,
      "public-profile-page-data",
      userSlugOrId,
      String(page),
    ],
    {
      revalidate: PUBLIC_PROFILE_PAGE_REVALIDATE_SECONDS,
      tags: [getPublicProfileRouteTag(userSlugOrId)],
    },
  )();
}

export function getCachedPublicCultivarPage(cultivarSegment: string) {
  const normalizedSegment = normalizeCultivarSegment(cultivarSegment);

  return unstable_cache(
    async () => getPublicCultivarPage(normalizedSegment),
    [PUBLIC_PAGE_DATA_CACHE_KEY_PREFIX, "public-cultivar-page", normalizedSegment],
    {
      revalidate: PUBLIC_CULTIVAR_PAGE_REVALIDATE_SECONDS,
      tags: [getPublicCultivarRouteTagFromNormalizedSegment(normalizedSegment)],
    },
  )();
}
