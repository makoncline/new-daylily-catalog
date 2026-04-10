import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { PublicInvalidationReference } from "@/types/public-types";
import type { PublicIsrPathInput } from "./public-isr-invalidation-plan";
import { invalidatePublicIsrForReferences } from "./public-isr-invalidation";

export function parseDashboardSyncSince(since: string | null) {
  return since ? new Date(since) : undefined;
}

export async function invalidateDashboardMutation(args: {
  db: PrismaClient;
  extraPaths?: PublicIsrPathInput[];
  references: PublicInvalidationReference[];
  requestUrl?: string;
}) {
  await invalidatePublicIsrForReferences({
    db: args.db,
    requestUrl: args.requestUrl,
    references: args.references,
    extraPaths: args.extraPaths,
  });
}

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

export async function assertOwnedList(args: {
  db: PrismaClient;
  listId: string;
  userId: string;
}) {
  const list = await args.db.list.findFirst({
    where: { id: args.listId, userId: args.userId },
    select: { id: true },
  });

  if (!list) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "List not found",
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
