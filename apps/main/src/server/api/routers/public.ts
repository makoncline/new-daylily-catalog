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

const publicInquiryCartItemSchema = cartItemSchema.extend({
  id: z.string().min(1).max(128),
  title: z.string().min(1).max(200),
  price: z.number().min(0).max(100000).nullable(),
  quantity: z.number().int().min(1).max(999),
  listingId: z.string().min(1).max(128),
  userId: z.string().min(1).max(128),
});

const publicInquiryInputSchema = z.object({
  userId: z.string().min(1).max(128),
  customerEmail: z.string().email().max(254),
  customerName: z.string().max(120).optional(),
  message: z.string().max(5000),
  items: z.array(publicInquiryCartItemSchema).max(25).optional(),
});

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
    .input(publicInquiryInputSchema)
    .mutation(async ({ ctx, input }) =>
      sendPublicInquiry(input, { headers: ctx.headers }),
    ),
});
