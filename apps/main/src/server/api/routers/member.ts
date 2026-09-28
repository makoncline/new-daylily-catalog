import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { hasLocalPublicReadDb, publicDb } from "@/server/db";
import {
  getCultivarReference,
  searchCultivarReferences,
} from "@/server/api/routers/dashboard-db/ahs";
import { dashboardDbImageRouter } from "@/server/api/routers/dashboard-db/image";
import { dashboardDbListRouter } from "@/server/api/routers/dashboard-db/list";
import { dashboardDbListingRouter } from "@/server/api/routers/dashboard-db/listing";
import { dashboardDbUserProfileRouter } from "@/server/api/routers/dashboard-db/user-profile";
import { getOwnedMemberListingDetail } from "@/server/services/member-listing-read";
import {
  getOwnedMemberListDetail,
  pageOwnedMemberLists,
} from "@/server/services/member-list-read";
import {
  memberListingSearchSchema,
  searchOwnedMemberListings,
} from "@/server/services/member-listing-search";
import { getOwnedMemberProfile } from "@/server/services/member-profile-read";
import {
  MEMBER_IMAGE_DETAIL_LIMIT,
  MEMBER_IMAGE_PAGE_LIMIT,
  pageOwnedMemberImages,
} from "@/server/services/member-image-read";
import {
  getMemberDashboardHandoff,
  memberDashboardHandoffSchema,
} from "@/server/services/member-dashboard-handoff";

const cursorPage = z.strictObject({
  cursor: z.string().min(1).max(128).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  listingId: z.string().trim().min(1).max(128).optional(),
});
const recordId = z.string().trim().min(1).max(128);

const memberListingRouter = createTRPCRouter({
  page: protectedProcedure
    .input(memberListingSearchSchema)
    .query(({ ctx, input }) =>
      searchOwnedMemberListings({
        database: ctx.db,
        input,
        userId: ctx.user.id,
      }),
    ),
  get: protectedProcedure
    .input(z.strictObject({ id: recordId }))
    .query(async ({ ctx, input }) => {
      const listing = await getOwnedMemberListingDetail({
        id: input.id,
        memberDb: ctx.db,
        publicDb: hasLocalPublicReadDb ? publicDb : null,
        userId: ctx.user.id,
      });
      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }
      return listing;
    }),
  create: dashboardDbListingRouter.create,
  update: dashboardDbListingRouter.update,
  linkCultivar: dashboardDbListingRouter.linkAhs,
  syncCultivarName: dashboardDbListingRouter.syncAhsName,
  unlinkCultivar: dashboardDbListingRouter.unlinkAhs,
  delete: dashboardDbListingRouter.delete,
});

const memberListRouter = createTRPCRouter({
  page: protectedProcedure.input(cursorPage).query(({ ctx, input }) =>
    pageOwnedMemberLists({
      database: ctx.db,
      userId: ctx.user.id,
      ...input,
    }),
  ),
  get: protectedProcedure
    .input(z.strictObject({ id: recordId }))
    .query(async ({ ctx, input }) => {
      const list = await getOwnedMemberListDetail({
        database: ctx.db,
        id: input.id,
        userId: ctx.user.id,
      });
      if (!list) {
        throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
      }
      return list;
    }),
  create: dashboardDbListRouter.create,
  update: dashboardDbListRouter.update,
  addListing: dashboardDbListRouter.addListingToList,
  removeListing: dashboardDbListRouter.removeListingFromList,
  removeListings: dashboardDbListRouter.removeListingsFromList,
  delete: dashboardDbListRouter.delete,
});

const memberProfileRouter = createTRPCRouter({
  get: protectedProcedure.query(({ ctx }) =>
    getOwnedMemberProfile(ctx.db, ctx.user.id),
  ),
  update: dashboardDbUserProfileRouter.updateBasic,
  updateContent: dashboardDbUserProfileRouter.updateContentPreservingBlocks,
  appendParagraph: dashboardDbUserProfileRouter.appendParagraph,
  updateParagraph: dashboardDbUserProfileRouter.updateParagraph,
  updateWithUrl: dashboardDbUserProfileRouter.update,
  replaceContent: dashboardDbUserProfileRouter.updateContent,
});

const memberImageRouter = createTRPCRouter({
  listForTarget: protectedProcedure
    .input(
      z.strictObject({
        type: z.enum(["listing", "profile"]),
        referenceId: recordId,
        cursor: recordId.optional(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MEMBER_IMAGE_PAGE_LIMIT)
          .default(MEMBER_IMAGE_DETAIL_LIMIT),
      }),
    )
    .query(({ ctx, input }) =>
      pageOwnedMemberImages({
        database: ctx.db,
        userId: ctx.user.id,
        ...input,
      }),
    ),
  get: dashboardDbImageRouter.get,
  prepareUpload: dashboardDbImageRouter.getPresignedUrl,
  create: dashboardDbImageRouter.create,
  reorder: dashboardDbImageRouter.reorder,
  delete: dashboardDbImageRouter.delete,
});

export const memberRouter = createTRPCRouter({
  handoff: createTRPCRouter({
    get: protectedProcedure
      .input(memberDashboardHandoffSchema)
      .query(({ ctx, input }) =>
        getMemberDashboardHandoff({
          database: ctx.db,
          userId: ctx.user.id,
          input,
        }),
      ),
  }),
  listing: memberListingRouter,
  list: memberListRouter,
  profile: memberProfileRouter,
  image: memberImageRouter,
  cultivar: createTRPCRouter({
    search: protectedProcedure
      .input(z.strictObject({ query: z.string().min(1).max(200) }))
      .query(({ input }) => searchCultivarReferences(publicDb, input.query)),
    get: protectedProcedure
      .input(z.strictObject({ id: recordId }))
      .query(({ input }) => getCultivarReference(publicDb, input.id)),
  }),
});

export type MemberRouter = typeof memberRouter;
