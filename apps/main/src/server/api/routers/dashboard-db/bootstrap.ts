import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
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
});
