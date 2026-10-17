import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { db } from "@/server/db";
import { getDashboardImagesForUser } from "./image";
import { getCultivarReferencesByIdsRaw } from "./cultivar-reference";

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

type DbClient = typeof db;

async function getDashboardBootstrapRoots(args: {
  db: DbClient;
  userId: string;
}) {
  const [listings, lists, profile] = await Promise.all([
    args.db.listing.findMany({
      where: { userId: args.userId },
      select: listingSelect,
      orderBy: { id: "asc" },
    }),
    args.db.list.findMany({
      where: { userId: args.userId },
      select: listSelect,
      orderBy: { id: "asc" },
    }),
    args.db.userProfile.findUnique({
      where: { userId: args.userId },
      select: { id: true },
    }),
  ]);

  const profileImages = profile
    ? await args.db.image.findMany({
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
}

export const dashboardDbBootstrapRouter = createTRPCRouter({
  catalog: protectedProcedure.query(async ({ ctx }) => {
    // Member data comes from primary so a refresh cannot undo a confirmed save.
    const [listings, lists, images] = await Promise.all([
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
      getDashboardImagesForUser(ctx.db, ctx.user.id),
    ]);
    const ids = [
      ...new Set(
        listings.flatMap((row) =>
          row.cultivarReferenceId ? [row.cultivarReferenceId] : [],
        ),
      ),
    ];
    // Reference data keeps the existing free replica read path.
    const cultivarReferences = [];
    for (let offset = 0; offset < ids.length; offset += 500) {
      cultivarReferences.push(
        ...(await getCultivarReferencesByIdsRaw(
          ctx.replicaDb ?? ctx.db,
          ids.slice(offset, offset + 500),
        )),
      );
    }
    return { listings, lists, images, cultivarReferences };
  }),

  replicaAvailable: protectedProcedure.query(({ ctx }) => {
    return Boolean(ctx.hasReplicaDb);
  }),

  roots: protectedProcedure.query(async ({ ctx }) => {
    return getDashboardBootstrapRoots({ db: ctx.db, userId: ctx.user.id });
  }),

  replicaRoots: protectedProcedure.query(async ({ ctx }) => {
    return getDashboardBootstrapRoots({
      db: ctx.replicaDb ?? ctx.db,
      userId: ctx.user.id,
    });
  }),
});
