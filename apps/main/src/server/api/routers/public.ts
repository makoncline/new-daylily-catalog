import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {
  getCultivarRouteSegments,
  getPublicCultivarPage,
} from "@/server/db/public-cultivar-read-model";
import {
  getListings,
  getPublicListingDetail,
  transformListings,
} from "@/server/db/public-listing-read-model";
import {
  getListingIdFromSlugOrId,
  getPublicProfile,
  getPublicProfiles,
  getUserIdFromSlugOrId,
} from "@/server/db/public-seller-read-model";
import { sendPublicInquiry } from "@/server/services/public-inquiry";
import { cartItemSchema } from "@/types";

export const publicRouter = createTRPCRouter({
  getPublicProfiles: publicProcedure.query(() => getPublicProfiles()),

  getProfile: publicProcedure
    .input(z.object({ userSlugOrId: z.string() }))
    .query(({ input }) => getPublicProfile(input.userSlugOrId)),

  getListings: publicProcedure
    .input(
      z.object({
        userSlugOrId: z.string(),
        limit: z.number().min(1).default(36),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const userId = await getUserIdFromSlugOrId(input.userSlugOrId);
      const items = await getListings({
        cursor: input.cursor,
        limit: input.limit,
        userId,
      });

      return transformListings(items);
    }),

  getListingById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => getPublicListingDetail(input.id)),

  getListing: publicProcedure
    .input(
      z.object({
        userSlugOrId: z.string(),
        listingSlugOrId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const userId = await getUserIdFromSlugOrId(input.userSlugOrId);
      const listingId = await getListingIdFromSlugOrId(
        input.listingSlugOrId,
        userId,
      );

      return getPublicListingDetail(listingId);
    }),

  getCultivarPage: publicProcedure
    .input(
      z.object({
        cultivarNormalizedName: z.string(),
      }),
    )
    .query(({ input }) => getPublicCultivarPage(input.cultivarNormalizedName)),

  getCultivarRouteSegments: publicProcedure.query(() =>
    getCultivarRouteSegments(),
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
