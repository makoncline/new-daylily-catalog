import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export async function assertOwnedListing(args: {
  db: PrismaClient;
  listingId: string;
  userId: string;
}) {
  const listing = await args.db.listing.findFirst({
    where: { id: args.listingId, userId: args.userId },
    select: { id: true },
  });

  if (!listing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Listing not found",
    });
  }
}

export async function assertOwnedProfile(args: {
  db: PrismaClient;
  userId: string;
  userProfileId: string;
}) {
  const profile = await args.db.userProfile.findFirst({
    where: { id: args.userProfileId, userId: args.userId },
    select: { id: true },
  });

  if (!profile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Profile not found",
    });
  }
}
