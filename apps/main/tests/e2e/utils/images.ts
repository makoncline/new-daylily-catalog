import type { E2EPrismaClient } from "../../../src/lib/test-utils/e2e-db";

interface AddProfileImageInput {
  db: E2EPrismaClient;
  clerkUserId: string;
  imageUrl: string;
  order?: number;
}

export async function addProfileImageForUser({
  db,
  clerkUserId,
  imageUrl,
  order = 0,
}: AddProfileImageInput) {
  const user = await db.user.findUnique({
    where: { clerkUserId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const profile = await db.userProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  return db.image.create({
    data: {
      url: imageUrl,
      userProfileId: profile.id,
      order,
    },
  });
}

interface AddListingImageInput {
  db: E2EPrismaClient;
  listingId: string;
  imageUrl: string;
  order?: number;
}

export async function addListingImage({
  db,
  listingId,
  imageUrl,
  order = 0,
}: AddListingImageInput) {
  return db.image.create({
    data: {
      url: imageUrl,
      listingId,
      order,
    },
  });
}
