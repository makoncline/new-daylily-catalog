import "server-only";

import type { Prisma } from "@prisma/client";
import type { db } from "@/server/db";
import { MEMBER_IMAGE_DETAIL_LIMIT } from "@/server/services/member-image-read";

const memberProfileSelect = {
  id: true,
  title: true,
  slug: true,
  logoUrl: true,
  description: true,
  content: true,
  location: true,
  createdAt: true,
  updatedAt: true,
  images: {
    select: {
      id: true,
      url: true,
      order: true,
      status: true,
      updatedAt: true,
    },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    take: MEMBER_IMAGE_DETAIL_LIMIT + 1,
  },
} as const satisfies Prisma.UserProfileSelect;

export async function getOwnedMemberProfile(
  database: typeof db,
  userId: string,
) {
  const profile = await database.userProfile.findUnique({
    where: { userId },
    select: memberProfileSelect,
  });
  if (!profile) return null;
  return {
    ...profile,
    images: profile.images.slice(0, MEMBER_IMAGE_DETAIL_LIMIT),
    imagesHasMore: profile.images.length > MEMBER_IMAGE_DETAIL_LIMIT,
  };
}
