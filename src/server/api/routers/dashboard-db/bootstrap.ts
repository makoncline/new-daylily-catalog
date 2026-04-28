import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const listingSelect = {
  id: true,
  userId: true,
  title: true,
  slug: true,
  price: true,
  description: true,
  privateNote: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  cultivarReferenceId: true,
} as const;

const listSelect = {
  id: true,
  userId: true,
  title: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  listings: {
    select: {
      id: true,
    },
  },
} as const;

const imageSelect = {
  id: true,
  url: true,
  order: true,
  listingId: true,
  userProfileId: true,
  createdAt: true,
  updatedAt: true,
  status: true,
} as const;

export const dashboardDbBootstrapRouter = createTRPCRouter({
  roots: protectedProcedure.query(async ({ ctx }) => {
    const [listings, lists, profile] = await Promise.all([
      ctx.db.listing.findMany({
        where: { userId: ctx.user.id },
        select: listingSelect,
        orderBy: { id: "asc" },
      }),
      ctx.db.list.findMany({
        where: { userId: ctx.user.id },
        select: listSelect,
        orderBy: { id: "asc" },
      }),
      ctx.db.userProfile.findUnique({
        where: { userId: ctx.user.id },
        select: { id: true },
      }),
    ]);

    const profileImages = profile
      ? await ctx.db.image.findMany({
          where: { userProfileId: profile.id },
          select: imageSelect,
          orderBy: [{ userProfileId: "asc" }, { order: "asc" }, { id: "asc" }],
        })
      : [];

    return {
      listings,
      lists,
      profileImages,
    };
  }),
});
