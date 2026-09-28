import "server-only";

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { db } from "@/server/db";
import { parseEditorContent } from "@/lib/editor-utils";
import { hasCurrentListMembers } from "@/server/services/member-list-read";

const recordId = z.string().trim().min(1).max(128);

export const memberDashboardHandoffSchema = z
  .strictObject({
    destination: z.enum([
      "profile",
      "edit_profile_url",
      "create_listing",
      "edit_listing",
      "delete_listing",
      "create_list",
      "edit_list",
      "delete_list",
      "manage_list",
      "remove_listings_from_list",
      "manage_listing_images",
      "remove_listing_image",
      "unlink_listing_cultivar",
      "manage_profile_images",
      "remove_profile_image",
      "edit_profile_content",
      "remove_profile_content_block",
      "import",
      "tags",
    ]),
    id: recordId.optional(),
    imageId: recordId.optional(),
    blockId: recordId.optional(),
    listingIds: z.array(recordId).min(1).max(20).optional(),
  })
  .superRefine((input, ctx) => {
    const listingDestination = [
      "create_listing",
      "edit_listing",
      "delete_listing",
      "manage_listing_images",
      "remove_listing_image",
      "unlink_listing_cultivar",
    ].includes(input.destination);
    const listDestination = [
      "create_list",
      "edit_list",
      "delete_list",
      "manage_list",
      "remove_listings_from_list",
    ].includes(input.destination);
    const needsId = listingDestination
      ? input.destination !== "create_listing"
      : listDestination && input.destination !== "create_list";
    const needsImageId =
      input.destination === "remove_listing_image" ||
      input.destination === "remove_profile_image";
    const needsListingIds = input.destination === "remove_listings_from_list";
    const needsBlockId = input.destination === "remove_profile_content_block";
    if (needsId !== Boolean(input.id)) {
      ctx.addIssue({
        code: "custom",
        message: needsId
          ? "Provide an owned record id."
          : "This destination does not use an id.",
      });
    }
    if (needsImageId !== Boolean(input.imageId)) {
      ctx.addIssue({
        code: "custom",
        message: "Provide an imageId only for image removal.",
      });
    }
    if (needsListingIds !== Boolean(input.listingIds)) {
      ctx.addIssue({
        code: "custom",
        message: "Provide listingIds only for list removal.",
      });
    }
    if (needsBlockId !== Boolean(input.blockId)) {
      ctx.addIssue({
        code: "custom",
        message: "Provide a blockId only for profile block removal.",
      });
    }
    if (
      input.listingIds &&
      new Set(input.listingIds).size !== input.listingIds.length
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Listing ids must be unique.",
      });
    }
  });

function notFound(message: string): never {
  throw new TRPCError({ code: "NOT_FOUND", message });
}

export async function getMemberDashboardHandoff(args: {
  database: typeof db;
  userId: string;
  input: z.infer<typeof memberDashboardHandoffSchema>;
}) {
  const { destination, id, imageId, blockId, listingIds } = args.input;
  const url = new URL("/dashboard", "https://daylily.invalid");
  let title: string | null = null;
  let canComplete = true;
  let nextStep = "Open this link in a browser while signed in.";

  if (
    [
      "profile",
      "edit_profile_url",
      "manage_profile_images",
      "remove_profile_image",
      "edit_profile_content",
      "remove_profile_content_block",
    ].includes(destination)
  ) {
    url.pathname = "/dashboard/profile";
    if (destination === "edit_profile_url") {
      url.hash = "profile-url";
      nextStep =
        "Open the profile URL field and confirm its warning before editing.";
    }
    if (destination === "manage_profile_images") url.hash = "profile-images";
    if (
      destination === "edit_profile_content" ||
      destination === "remove_profile_content_block"
    ) {
      url.hash = "profile-content";
    }
    if (destination === "remove_profile_content_block") {
      const profile = await args.database.userProfile.findUnique({
        where: { userId: args.userId },
        select: { content: true },
      });
      const content = parseEditorContent(profile?.content ?? null);
      if (!content?.blocks.some((block) => block.id === blockId)) {
        notFound("Profile content block not found.");
      }
      url.searchParams.set("contentBlock", blockId!);
      nextStep =
        "Open this link, review the highlighted block, and remove it in the dashboard editor.";
    }
    if (destination === "remove_profile_image") {
      const profile = await args.database.userProfile.findUnique({
        where: { userId: args.userId },
        select: { id: true },
      });
      if (!profile) notFound("Profile not found.");
      const image = await args.database.image.findFirst({
        where: { id: imageId!, userProfileId: profile.id },
        select: { id: true },
      });
      if (!image) notFound("Profile image not found.");
      url.searchParams.set("intent", "remove_image");
      url.searchParams.set("imageId", image.id);
      nextStep = "Open this link and confirm image removal in the dashboard.";
    }
  } else if (destination === "import") {
    url.pathname = "/dashboard/imports";
  } else if (destination === "tags") {
    url.pathname = "/dashboard/tags";
  } else if (
    [
      "create_listing",
      "edit_listing",
      "delete_listing",
      "manage_listing_images",
      "remove_listing_image",
      "unlink_listing_cultivar",
    ].includes(destination)
  ) {
    url.pathname = "/dashboard/listings";
    if (destination === "create_listing") {
      url.searchParams.set("creating", "true");
    } else {
      const listing = await args.database.listing.findFirst({
        where: { id: id!, userId: args.userId },
        select: { title: true, cultivarReferenceId: true },
      });
      if (!listing) notFound("Listing not found.");
      title = listing.title;
      url.searchParams.set("editing", id!);
      if (destination === "manage_listing_images") url.hash = "listing-images";
      if (destination === "unlink_listing_cultivar") {
        if (!listing.cultivarReferenceId) {
          notFound("Listing has no linked cultivar.");
        }
        url.hash = "listing-cultivar";
        nextStep = "Open the linked cultivar section and choose Unlink.";
      }
      if (destination === "remove_listing_image") {
        const image = await args.database.image.findFirst({
          where: { id: imageId!, listingId: id! },
          select: { id: true },
        });
        if (!image) notFound("Listing image not found.");
        url.searchParams.set("intent", "remove_image");
        url.searchParams.set("imageId", image.id);
        nextStep = "Open this link and confirm image removal in the dashboard.";
      }
    }
  } else {
    url.pathname = "/dashboard/lists";
    if (destination === "create_list") {
      url.searchParams.set("creating", "true");
    } else {
      const list = await args.database.list.findFirst({
        where: { id: id!, userId: args.userId },
        select: { title: true },
      });
      if (!list) notFound("List not found.");
      title = list.title;
      if (
        destination === "manage_list" ||
        destination === "remove_listings_from_list"
      ) {
        url.pathname = `/dashboard/lists/${encodeURIComponent(id!)}`;
      } else {
        url.searchParams.set("editing", id!);
      }
      if (destination === "remove_listings_from_list") {
        const members = await args.database.listing.findMany({
          where: {
            id: { in: listingIds! },
            userId: args.userId,
            lists: { some: { id: id! } },
          },
          select: { id: true },
        });
        if (members.length !== listingIds!.length) {
          notFound("One or more listings are not in this list.");
        }
        url.searchParams.set("remove", listingIds!.join(","));
        nextStep =
          "Open this link and confirm removal of the selected listings.";
      }
      if (
        destination === "delete_list" &&
        (await hasCurrentListMembers(args.database, id!))
      ) {
        canComplete = false;
        nextStep = "Remove the listings from this list before deletion.";
        url.pathname = `/dashboard/lists/${encodeURIComponent(id!)}`;
        url.searchParams.delete("editing");
      }
    }
  }

  if (destination.startsWith("delete_") && canComplete) {
    url.searchParams.set("intent", "delete");
    nextStep =
      "Open this link and review the confirmation. Deletion requires a click.";
  }

  return {
    dashboardPath: `${url.pathname}${url.search}${url.hash}`,
    destination,
    title,
    canComplete,
    nextStep,
  };
}
