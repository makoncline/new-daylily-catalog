import { revalidatePath } from "next/cache";
import type { PrismaClient } from "@prisma/client";

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

  revalidatePath("/[userSlugOrId]/page/[page]", "page");
  revalidatePath("/catalogs");
  revalidatePath("/sitemap.xml");
}
