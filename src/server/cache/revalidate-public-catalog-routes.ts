import { revalidatePath } from "next/cache";
import type { PrismaClient } from "@prisma/client";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";

const ENABLE_PUBLIC_ROUTE_REVALIDATION = false;

interface RevalidatePublicCatalogRoutesInput {
  db: PrismaClient;
  userId: string;
  additionalUserSegments?: string[];
}

function toUserPath(userSegment: string) {
  return `/${userSegment}`;
}

function toUserSearchPath(userSegment: string) {
  return `/${userSegment}/search`;
}

function toCultivarPath(cultivarSegment: string) {
  return `/cultivar/${cultivarSegment}`;
}

export function revalidateCultivarRoutesByNormalizedNames(
  normalizedNames: Array<string | null | undefined>,
) {
  const cultivarSegments = new Set<string>();

  for (const normalizedName of normalizedNames) {
    const cultivarSegment = toCultivarRouteSegment(normalizedName);

    if (cultivarSegment) {
      cultivarSegments.add(cultivarSegment);
    }
  }

  for (const cultivarSegment of cultivarSegments) {
    revalidatePath(toCultivarPath(cultivarSegment));
  }
}

export async function revalidatePublicCatalogRoutes({
  db,
  userId,
  additionalUserSegments = [],
}: RevalidatePublicCatalogRoutesInput) {
  // Temporarily disabled: keep mutation flow intact while we design a
  // debounced/deduplicated queue-based revalidation system.
  if (!ENABLE_PUBLIC_ROUTE_REVALIDATION) {
    return;
  }

  const profile = await db.userProfile.findUnique({
    where: {
      userId,
    },
    select: {
      slug: true,
    },
  });

  const userSegments = new Set<string>([userId, ...additionalUserSegments]);

  if (profile?.slug) {
    userSegments.add(profile.slug);
  }

  for (const userSegment of userSegments) {
    revalidatePath(toUserPath(userSegment));
    revalidatePath(toUserSearchPath(userSegment));
  }

  // Never use route patterns here. Revalidate exact paths only.
  revalidatePath("/catalogs");
}
