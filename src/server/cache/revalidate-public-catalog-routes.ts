import { revalidatePath } from "next/cache";
import type { PrismaClient } from "@prisma/client";

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
  revalidatePath("/sitemap.xml");
}
