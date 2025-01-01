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

export async function deleteImage(imageId: string) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("Unauthorized");
  }

  const dbUser = await db.user.findUnique({
    where: { clerkUserId: clerkUser.id },
  });

  if (!dbUser) {
    throw new Error("User not found in database");
  }

  // Get the image and check ownership
  const image = await db.image.findUnique({
    where: { id: imageId },
    include: { listing: true },
  });

  if (!image || !image.listing) {
    throw new Error("Image not found");
  }

  if (image.listing.userId !== dbUser.id) {
    throw new Error("Not authorized");
  }

  // Delete the image
  await db.image.delete({
    where: { id: imageId },
  });

  revalidatePath("/listings");
  revalidatePath(`/listings/${image.listingId}/edit`);
}

export async function updateImageOrder(imageId: string, newOrder: number) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("Unauthorized");
  }

  const dbUser = await db.user.findUnique({
    where: { clerkUserId: clerkUser.id },
  });

  if (!dbUser) {
    throw new Error("User not found in database");
  }

  // Get the image and check ownership
  const image = await db.image.findUnique({
    where: { id: imageId },
    include: { listing: true },
  });

  if (!image || !image.listing) {
    throw new Error("Image not found");
  }

  if (image.listing.userId !== dbUser.id) {
    throw new Error("Not authorized");
  }

  // Get all images for this listing
  const images = await db.image.findMany({
    where: { listingId: image.listingId },
    orderBy: { order: "asc" },
  });

  // Find the image to move
  const currentIndex = images.findIndex((img) => img.id === imageId);
  if (currentIndex === -1) {
    throw new Error("Image not found in listing");
  }

  // Calculate new orders by filtering out the moved image and inserting it at the new position
  const reorderedImages = [
    ...images.slice(0, currentIndex),
    ...images.slice(currentIndex + 1),
  ];
  reorderedImages.splice(newOrder, 0, images[currentIndex]!);

  // Update all images with their new orders
  await db.$transaction(
    reorderedImages.map((img, index) =>
      db.image.update({
        where: { id: img.id },
        data: { order: index },
      }),
    ),
  );

  revalidatePath("/listings");
  revalidatePath(`/listings/${image.listingId}/edit`);
}
