import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { getListingIdFromSlugOrId } from "@/server/db/getPublicProfile";
import { transformListings } from "@/server/db/public-listing-read-model";
import {
  getCachedCultivarRouteSegments,
  getCachedPublicCultivarPage,
  getCachedPublicListingDetail,
  getCachedPublicListings,
  getCachedPublicProfile,
  getCachedPublicUserIdFromSlugOrId,
  getCachedPublicProfiles,
} from "@/server/db/public-cache";
import { sendPublicInquiry } from "@/server/services/public-inquiry";
import { cartItemSchema } from "@/types";

async function runPublicQuery<T>(args: {
  handler: () => Promise<T>;
  logMessage: string;
  message: string;
  preserveTrpcError?: boolean;
  includeCause?: boolean;
}) {
  try {
    return await args.handler();
  } catch (error) {
    if (args.preserveTrpcError !== false && error instanceof TRPCError) {
      throw error;
    }

    console.error(args.logMessage, error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: args.message,
      ...(args.includeCause ? { cause: error } : {}),
    });
  }
}

export const publicRouter = createTRPCRouter({
  getPublicProfiles: publicProcedure.query(async () =>
    runPublicQuery({
      handler: () => getCachedPublicProfiles(),
      logMessage: "TRPC Error fetching public profiles:",
      message: "Failed to fetch public profiles",
      preserveTrpcError: false,
    }),
  ),

  getProfile: publicProcedure
    .input(z.object({ userSlugOrId: z.string() }))
    .query(async ({ input }) =>
      runPublicQuery({
        handler: () => getCachedPublicProfile(input.userSlugOrId),
        logMessage: "Error fetching public profile:",
        message: "Failed to fetch public profile",
      }),
    ),

  getListings: publicProcedure
    .input(
      z.object({
        userSlugOrId: z.string(),
        limit: z.number().min(1).default(36),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) =>
      runPublicQuery({
        handler: async () => {
          const userId = await getCachedPublicUserIdFromSlugOrId(
            input.userSlugOrId,
          );
          const items = await getCachedPublicListings({
            userId,
            limit: input.limit,
            cursor: input.cursor,
          });

          return transformListings(items);
        },
        logMessage: "Error fetching public listings:",
        message: "Failed to fetch public listings",
        includeCause: true,
      }),
    ),

  getListingById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) =>
      runPublicQuery({
        handler: () => getCachedPublicListingDetail(input.id),
        logMessage: "Error fetching listing:",
        message: "Failed to fetch listing",
      }),
    ),

  getListing: publicProcedure
    .input(
      z.object({
        userSlugOrId: z.string(),
        listingSlugOrId: z.string(),
      }),
    )
    .query(async ({ input }) =>
      runPublicQuery({
        handler: async () => {
          const userId = await getCachedPublicUserIdFromSlugOrId(
            input.userSlugOrId,
          );
          const listingId = await getListingIdFromSlugOrId(
            input.listingSlugOrId,
            userId,
          );

          return getCachedPublicListingDetail(listingId);
        },
        logMessage: "Error fetching listing:",
        message: "Failed to fetch listing",
      }),
    ),

  getCultivarPage: publicProcedure
    .input(
      z.object({
        cultivarNormalizedName: z.string(),
      }),
    )
    .query(async ({ input }) =>
      runPublicQuery({
        handler: () => getCachedPublicCultivarPage(input.cultivarNormalizedName),
        logMessage: "Error fetching cultivar page:",
        message: "Failed to fetch cultivar page",
      }),
    ),

  getCultivarRouteSegments: publicProcedure.query(async () =>
    runPublicQuery({
      handler: () => getCachedCultivarRouteSegments(),
      logMessage: "Error fetching cultivar route segments:",
      message: "Failed to fetch cultivar route segments",
    }),
  ),

  sendMessage: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        customerEmail: z.string().email(),
        customerName: z.string().optional(),
        message: z.string(),
        items: z.array(cartItemSchema).optional(),
      }),
    )
    .mutation(async ({ input }) => sendPublicInquiry(input)),
});
