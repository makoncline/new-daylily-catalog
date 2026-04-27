import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { env, requireEnv } from "@/env";
import { APP_CONFIG } from "@/config/constants";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
import path from "node:path";
import { imageTypeSchema } from "@/types/image";
import type { db } from "@/server/db";
import {
  buildListingImageMutationRefs,
  buildProfileImageMutationRefs,
  getSellerCultivarMutationRefs,
} from "./public-isr-reference-helpers";
import {
  assertOwnedListing,
  assertOwnedProfile,
  dashboardSyncInputSchema,
  invalidateDashboardMutation,
  parseDashboardSyncSince,
} from "./dashboard-db-router-helpers";

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

async function getOwnedImageWhere(args: { db: DbClient; userId: string }) {
  const [listingRows, profile] = await Promise.all([
    args.db.listing.findMany({
      where: { userId: args.userId },
      select: { id: true },
    }),
    args.db.userProfile.findUnique({
      where: { userId: args.userId },
      select: { id: true },
    }),
  ]);

  const listingIds = listingRows.map((listing) => listing.id);
  const ownerFilters = [
    ...(listingIds.length ? [{ listingId: { in: listingIds } }] : []),
    ...(profile ? [{ userProfileId: profile.id }] : []),
  ];

  return ownerFilters.length ? { OR: ownerFilters } : null;
}

async function getImageInvalidationReferences(args: {
  db: DbClient;
  referenceId: string;
  type: "listing" | "profile";
  userId: string;
}) {
  return args.type === "listing"
    ? buildListingImageMutationRefs(args.referenceId)
    : buildProfileImageMutationRefs(args.userId).concat(
        await getSellerCultivarMutationRefs({
          db: args.db,
          userId: args.userId,
        }),
      );
}

export const dashboardDbImageRouter = createTRPCRouter({
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        fileName: z.string(),
        contentType: z.string(),
        size: z.number().max(APP_CONFIG.UPLOAD.MAX_FILE_SIZE),
        referenceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.type === "listing") {
        await assertOwnedListing({
          db: ctx.db,
          listingId: input.referenceId,
          userId: ctx.user.id,
        });
      } else {
        await assertOwnedProfile({
          db: ctx.db,
          userId: ctx.user.id,
          userProfileId: input.referenceId,
        });
      }

      const s3Client = new S3Client({
        region: requireEnv("AWS_REGION", env.AWS_REGION),
        credentials: {
          accessKeyId: requireEnv("AWS_ACCESS_KEY_ID", env.AWS_ACCESS_KEY_ID),
          secretAccessKey: requireEnv(
            "AWS_SECRET_ACCESS_KEY",
            env.AWS_SECRET_ACCESS_KEY,
          ),
        },
      });

      const ext = path.extname(input.fileName);
      const fileId = crypto.randomBytes(4).toString("hex");
      const key = `${ctx.user.id}/${input.referenceId}/${fileId}${ext}`;

      const command = new PutObjectCommand({
        Bucket: requireEnv("AWS_BUCKET_NAME", env.AWS_BUCKET_NAME),
        Key: key,
        ContentType: input.contentType,
      });

      const bucketName = requireEnv("AWS_BUCKET_NAME", env.AWS_BUCKET_NAME);
      const region = requireEnv("AWS_REGION", env.AWS_REGION);
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

      return {
        presignedUrl: url,
        key,
        url: `https://${bucketName}.s3.${region}.amazonaws.com/${key}`,
      } as const;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const ownedImageWhere = await getOwnedImageWhere({
      db: ctx.db,
      userId: ctx.user.id,
    });
    if (!ownedImageWhere) return [];

    return ctx.db.image.findMany({
      where: ownedImageWhere,
      orderBy: [
        { listingId: "asc" },
        { userProfileId: "asc" },
        { order: "asc" },
      ],
      select: imageSelect,
    });
  }),

  listByOwnerRefs: protectedProcedure
    .input(
      z.object({
        listingIds: z.array(z.string().trim().min(1)).max(500),
        includeProfileImages: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [listingRows, profile] = await Promise.all([
        input.listingIds.length
          ? ctx.db.listing.findMany({
              where: { id: { in: input.listingIds }, userId: ctx.user.id },
              select: { id: true },
            })
          : Promise.resolve([]),
        input.includeProfileImages
          ? ctx.db.userProfile.findUnique({
              where: { userId: ctx.user.id },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);

      const ownerFilters = [
        ...(listingRows.length
          ? [{ listingId: { in: listingRows.map((row) => row.id) } }]
          : []),
        ...(profile ? [{ userProfileId: profile.id }] : []),
      ];
      if (!ownerFilters.length) return [];

      return ctx.db.image.findMany({
        where: { OR: ownerFilters },
        orderBy: [
          { listingId: "asc" },
          { userProfileId: "asc" },
          { order: "asc" },
        ],
        select: imageSelect,
      });
    }),

  sync: protectedProcedure
    .input(dashboardSyncInputSchema)
    .query(async ({ ctx, input }) => {
      const since = parseDashboardSyncSince(input.since);
      const ownedImageWhere = await getOwnedImageWhere({
        db: ctx.db,
        userId: ctx.user.id,
      });
      if (!ownedImageWhere) return [];

      return ctx.db.image.findMany({
        where: {
          AND: [
            ownedImageWhere,
            ...(since ? [{ updatedAt: { gte: since } }] : []),
            ...(input.cursor ? [{ id: { gt: input.cursor.id } }] : []),
          ],
        },
        orderBy: { id: "asc" },
        select: imageSelect,
        ...(input.limit ? { take: input.limit } : {}),
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        referenceId: z.string(),
        url: z.string().min(1),
        key: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.type === "listing") {
        await assertOwnedListing({
          db: ctx.db,
          listingId: input.referenceId,
          userId: ctx.user.id,
        });
      } else {
        await assertOwnedProfile({
          db: ctx.db,
          userId: ctx.user.id,
          userProfileId: input.referenceId,
        });
      }

      const whereClause =
        input.type === "listing"
          ? { listingId: input.referenceId }
          : { userProfileId: input.referenceId };

      const currentCount = await ctx.db.image.count({ where: whereClause });

      const image = await ctx.db.image.create({
        data: {
          url: input.url,
          order: currentCount,
          ...(input.type === "listing"
            ? { listingId: input.referenceId }
            : { userProfileId: input.referenceId }),
        },
        select: imageSelect,
      });

      await invalidateDashboardMutation({
        db: ctx.db,
        requestUrl: ctx.requestUrl,
        references: await getImageInvalidationReferences({
          db: ctx.db,
          referenceId: input.referenceId,
          type: input.type,
          userId: ctx.user.id,
        }),
      });

      return image;
    }),

  update: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        referenceId: z.string(),
        imageId: z.string(),
        url: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.type === "listing") {
        await assertOwnedListing({
          db: ctx.db,
          listingId: input.referenceId,
          userId: ctx.user.id,
        });
      } else {
        await assertOwnedProfile({
          db: ctx.db,
          userId: ctx.user.id,
          userProfileId: input.referenceId,
        });
      }

      const existing = await ctx.db.image.findUnique({
        where: { id: input.imageId },
        select: {
          id: true,
          listingId: true,
          userProfileId: true,
        },
      });

      const belongsToTarget =
        input.type === "listing"
          ? existing?.listingId === input.referenceId
          : existing?.userProfileId === input.referenceId;

      if (!existing || !belongsToTarget) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Image not found",
        });
      }

      const image = await ctx.db.image.update({
        where: { id: input.imageId },
        data: { url: input.url },
        select: imageSelect,
      });

      await invalidateDashboardMutation({
        db: ctx.db,
        requestUrl: ctx.requestUrl,
        references: await getImageInvalidationReferences({
          db: ctx.db,
          referenceId: input.referenceId,
          type: input.type,
          userId: ctx.user.id,
        }),
      });

      return image;
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        referenceId: z.string(),
        images: z
          .array(z.object({ id: z.string(), order: z.number().int().min(0) }))
          .min(1, "At least one image is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.type === "listing") {
        await assertOwnedListing({
          db: ctx.db,
          listingId: input.referenceId,
          userId: ctx.user.id,
        });
      } else {
        await assertOwnedProfile({
          db: ctx.db,
          userId: ctx.user.id,
          userProfileId: input.referenceId,
        });
      }

      const whereClause =
        input.type === "listing"
          ? { listingId: input.referenceId }
          : { userProfileId: input.referenceId };

      const allImages = await ctx.db.image.findMany({
        where: whereClause,
        orderBy: { order: "asc" },
        select: { id: true },
      });

      const inputIds = new Set(input.images.map((img) => img.id));
      const mergedOrder = [
        ...input.images,
        ...allImages
          .filter((img) => !inputIds.has(img.id))
          .map((img, i) => ({
            id: img.id,
            order: input.images.length + i,
          })),
      ];

      await ctx.db.$transaction(
        mergedOrder.map((img, index) =>
          ctx.db.image.update({
            where: { id: img.id },
            data: { order: index },
          }),
        ),
      );

      await invalidateDashboardMutation({
        db: ctx.db,
        requestUrl: ctx.requestUrl,
        references: await getImageInvalidationReferences({
          db: ctx.db,
          referenceId: input.referenceId,
          type: input.type,
          userId: ctx.user.id,
        }),
      });

      return { success: true } as const;
    }),

  delete: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        referenceId: z.string(),
        imageId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.type === "listing") {
        await assertOwnedListing({
          db: ctx.db,
          listingId: input.referenceId,
          userId: ctx.user.id,
        });
      } else {
        await assertOwnedProfile({
          db: ctx.db,
          userId: ctx.user.id,
          userProfileId: input.referenceId,
        });
      }

      const whereClause =
        input.type === "listing"
          ? { listingId: input.referenceId }
          : { userProfileId: input.referenceId };

      await ctx.db.$transaction(async (tx) => {
        await tx.image.delete({ where: { id: input.imageId } });

        const remaining = await tx.image.findMany({
          where: whereClause,
          orderBy: { order: "asc" },
          select: { id: true },
        });

        await Promise.all(
          remaining.map((img, index) =>
            tx.image.update({
              where: { id: img.id },
              data: { order: index },
            }),
          ),
        );
      });

      await invalidateDashboardMutation({
        db: ctx.db,
        requestUrl: ctx.requestUrl,
        references: await getImageInvalidationReferences({
          db: ctx.db,
          referenceId: input.referenceId,
          type: input.type,
          userId: ctx.user.id,
        }),
      });

      return { success: true } as const;
    }),
});
