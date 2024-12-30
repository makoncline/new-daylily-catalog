"use server";

import { db } from "@/server/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { TRPCError } from "@trpc/server";
import { type ListingFormData } from "@/types/schemas/listing";

async function checkListingOwnership(userId: string, listingId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Listing not found",
    });
  }

  if (listing.userId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not authorized",
    });
  }

  return listing;
}

export async function updateListing(listingId: string, data: ListingFormData) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  const dbUser = await db.user.findUnique({
    where: { clerkUserId: clerkUser.id },
  });

  if (!dbUser) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found in database",
    });
  }

  await checkListingOwnership(dbUser.id, listingId);

  const result = await db.listing.update({
    where: { id: listingId },
    data,
    include: {
      ahsListing: true,
      images: {
        orderBy: { order: "asc" },
      },
    },
  });

  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}/edit`);

  return result;
}

export async function deleteListing(listingId: string) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  const dbUser = await db.user.findUnique({
    where: { clerkUserId: clerkUser.id },
  });

  if (!dbUser) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found in database",
    });
  }

  await checkListingOwnership(dbUser.id, listingId);

  const result = await db.listing.delete({
    where: { id: listingId },
  });

  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}/edit`);

  return result;
}
