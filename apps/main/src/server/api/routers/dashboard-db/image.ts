import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { APP_CONFIG } from "@/config/constants";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
import {
  imageContentTypeSchema,
  imageTypeSchema,
} from "@/types/image";
import type { db } from "@/server/db";
import {
  areImageAssetsEnabled,
  imageAssetUrlSelect,
  resolveLegacyImagesWithAssets,
} from "@/server/services/image-asset-read-model";
import {
  getR2OriginalUploadMetadata,
  isExpectedOriginalImageAssetKey,
} from "@/server/services/image-asset-storage";
import { scheduleImageAssetVariantProcessing } from "@/server/services/image-asset-scheduler";
import {
  buildLegacyImageKey,
  getLegacyImageUploadBucketName,
  getLegacyImageUrl,
  getLegacyS3Client,
  getValidatedLegacyImageUrl,
} from "@/server/services/legacy-image-storage";
import {
  createUserImageRecord,
  getListingIdForImageAsset,
  getUserImageOwnerWhere,
} from "@/server/services/user-image-records";
import {
  assertOwnedListing,
  assertOwnedProfile,
  dashboardSyncInputSchema,
  parseDashboardSyncSince,
} from "./dashboard-db-router-helpers";

type DbClient = typeof db;
type DashboardImageRow = ReturnType<typeof mapImageRow>;

type ImageRow = {
  id: string;
  url: string;
  order: number;
  listingId: string | null;
  userProfileId: string | null;
  createdAt: Date | string | number;
  updatedAt: Date | string | number;
  status: string | null;
};

function toDate(value: Date | string | number) {
  return value instanceof Date ? value : new Date(value);
}

function mapImageRow(row: ImageRow) {
  return {
    ...row,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

function sortImagesForDashboard(
  a: ReturnType<typeof mapImageRow>,
  b: ReturnType<typeof mapImageRow>,
) {
  return (
    (a.listingId ?? "").localeCompare(b.listingId ?? "") ||
    (a.userProfileId ?? "").localeCompare(b.userProfileId ?? "") ||
    a.order - b.order ||
    a.id.localeCompare(b.id)
  );
}

function invalidImageAssetMetadata() {
  return new TRPCError({
    code: "BAD_REQUEST",
    message: "Image asset upload metadata is invalid",
  });
}

async function getDashboardImagesByListingIds(args: {
  db: DbClient;
  userId: string;
  listingIds: string[];
}) {
  const uniqueListingIds = Array.from(new Set(args.listingIds));
  if (!uniqueListingIds.length) return [];

  const rows = await args.db.$queryRaw<ImageRow[]>(Prisma.sql`
    SELECT
      i."id",
      i."url",
      i."order",
      i."listingId",
      i."userProfileId",
      i."createdAt",
      i."updatedAt",
      i."status"
    FROM "Image" i
    INNER JOIN "Listing" l ON l."id" = i."listingId"
    WHERE
      i."listingId" IN (${Prisma.join(uniqueListingIds)})
      AND l."userId" = ${args.userId}
  `);

  const mappedRows = rows.map(mapImageRow).sort(sortImagesForDashboard);
  return resolveDashboardImageRows({ db: args.db, rows: mappedRows });
}

async function resolveDashboardImageRows(args: {
  db: DbClient;
  rows: DashboardImageRow[];
}) {
  if (!areImageAssetsEnabled() || args.rows.length === 0) {
    return args.rows;
  }

  const imageIds = args.rows.map((row) => row.id);
  const assets = await args.db.imageAsset.findMany({
    where: {
      legacyImageId: { in: imageIds },
    },
    select: imageAssetUrlSelect,
  });

  return resolveLegacyImagesWithAssets({
    images: args.rows,
    imageAssets: assets,
    variant: "thumb",
  });
}

export const dashboardDbImageRouter = createTRPCRouter({
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        contentType: imageContentTypeSchema,
        size: z.number().int().positive().max(APP_CONFIG.UPLOAD.MAX_FILE_SIZE),
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

      const imageId = crypto.randomUUID();
      const fileId = crypto.randomBytes(16).toString("hex");
      const key = buildLegacyImageKey({
        contentType: input.contentType,
        fileId,
        referenceId: input.referenceId,
        userId: ctx.user.id,
      });
      const r2 = await getR2OriginalUploadMetadata({
        kind: input.type,
        userId: ctx.user.id,
        listingId: getListingIdForImageAsset({
          type: input.type,
          referenceId: input.referenceId,
        }),
        imageAssetId: imageId,
        contentType: input.contentType,
      });

      const command = new PutObjectCommand({
        Bucket: getLegacyImageUploadBucketName(),
        Key: key,
        ContentType: input.contentType,
        ContentLength: input.size,
      });

      const url = await getSignedUrl(getLegacyS3Client(), command, {
        expiresIn: 3600,
      });

      return {
        imageId,
        presignedUrl: url,
        key,
        url: getLegacyImageUrl(key),
        r2,
      } as const;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.$queryRaw<ImageRow[]>(Prisma.sql`
      SELECT
        i."id",
        i."url",
        i."order",
        i."listingId",
        i."userProfileId",
        i."createdAt",
        i."updatedAt",
        i."status"
      FROM "Listing" l
      INNER JOIN "Image" i ON i."listingId" = l."id"
      WHERE l."userId" = ${ctx.user.id}
      UNION
      SELECT
        i."id",
        i."url",
        i."order",
        i."listingId",
        i."userProfileId",
        i."createdAt",
        i."updatedAt",
        i."status"
      FROM "UserProfile" up
      INNER JOIN "Image" i ON i."userProfileId" = up."id"
      WHERE up."userId" = ${ctx.user.id}
    `);

    const mappedRows = rows.map(mapImageRow).sort(sortImagesForDashboard);
    return resolveDashboardImageRows({ db: ctx.db, rows: mappedRows });
  }),

  listByListingIds: protectedProcedure
    .input(
      z.object({
        listingIds: z.array(z.string().trim().min(1)).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return getDashboardImagesByListingIds({
        db: ctx.db,
        userId: ctx.user.id,
        listingIds: input.listingIds,
      });
    }),

  listByListingIdsReplica: protectedProcedure
    .input(
      z.object({
        listingIds: z.array(z.string().trim().min(1)).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return getDashboardImagesByListingIds({
        db: ctx.replicaDb ?? ctx.db,
        userId: ctx.user.id,
        listingIds: input.listingIds,
      });
    }),

  sync: protectedProcedure
    .input(dashboardSyncInputSchema)
    .query(async ({ ctx, input }) => {
      const since = parseDashboardSyncSince(input.since);
      const rows = await ctx.db.$queryRaw<ImageRow[]>(Prisma.sql`
        SELECT
          i."id",
          i."url",
          i."order",
          i."listingId",
          i."userProfileId",
          i."createdAt",
          i."updatedAt",
          i."status"
        FROM "Image" i
        WHERE
          (
            EXISTS (
              SELECT 1
              FROM "Listing" l
              WHERE l."id" = i."listingId"
                AND l."userId" = ${ctx.user.id}
            )
            OR EXISTS (
              SELECT 1
              FROM "UserProfile" up
              WHERE up."id" = i."userProfileId"
                AND up."userId" = ${ctx.user.id}
            )
          )
          ${since ? Prisma.sql`AND i."updatedAt" >= ${since}` : Prisma.empty}
          ${
            input.cursor
              ? Prisma.sql`AND i."id" > ${input.cursor.id}`
              : Prisma.empty
          }
        ORDER BY i."id" ASC
        ${input.limit ? Prisma.sql`LIMIT ${input.limit}` : Prisma.empty}
      `);

      return resolveDashboardImageRows({
        db: ctx.db,
        rows: rows.map(mapImageRow),
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        referenceId: z.string(),
        url: z.url(),
        key: z.string().min(1),
        imageId: z.string().optional(),
        r2OriginalKey: z.string().min(1).optional(),
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

      const imageUrl = getValidatedLegacyImageUrl({
        key: input.key,
        referenceId: input.referenceId,
        url: input.url,
        userId: ctx.user.id,
      });
      if (!imageUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid image upload URL",
        });
      }

      const owner = { type: input.type, referenceId: input.referenceId };
      const whereClause = getUserImageOwnerWhere(owner);

      const currentCount = await ctx.db.image.count({ where: whereClause });

      if (input.r2OriginalKey) {
        if (!input.imageId) {
          throw invalidImageAssetMetadata();
        }

        const isExpectedKey = isExpectedOriginalImageAssetKey({
          kind: input.type,
          userId: ctx.user.id,
          listingId: getListingIdForImageAsset(owner),
          key: input.r2OriginalKey,
          imageAssetId: input.imageId,
        });
        if (!isExpectedKey) {
          throw invalidImageAssetMetadata();
        }
      }

      const image = await ctx.db.$transaction(async (tx) => {
        return createUserImageRecord({
          db: tx,
          imageId: input.imageId,
          order: currentCount,
          owner,
          r2OriginalKey: input.r2OriginalKey,
          url: imageUrl,
        });
      });

      const [resolved] = await resolveDashboardImageRows({
        db: ctx.db,
        rows: [image],
      });

      if (input.r2OriginalKey) {
        scheduleImageAssetVariantProcessing({
          db: ctx.db,
          imageAssetId: image.id,
        });
      }

      return resolved ?? image;
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

      const whereClause = getUserImageOwnerWhere({
        type: input.type,
        referenceId: input.referenceId,
      });

      const allImages = await ctx.db.image.findMany({
        where: whereClause,
        orderBy: { order: "asc" },
        select: { id: true },
      });

      const inputIds = new Set(input.images.map((img) => img.id));
      const ownedImageIds = new Set(allImages.map((img) => img.id));
      const hasUnownedImage = input.images.some(
        (img) => !ownedImageIds.has(img.id),
      );
      if (hasUnownedImage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Image not found",
        });
      }

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
        mergedOrder.flatMap((img, index) => [
          ctx.db.image.update({
            where: { id: img.id },
            data: { order: index },
          }),
          ctx.db.imageAsset.updateMany({
            where: { legacyImageId: img.id },
            data: { order: index },
          }),
        ]),
      );

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

      const whereClause = getUserImageOwnerWhere({
        type: input.type,
        referenceId: input.referenceId,
      });

      await ctx.db.$transaction(async (tx) => {
        const deleted = await tx.image.deleteMany({
          where: { id: input.imageId, ...whereClause },
        });
        if (deleted.count === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Image not found",
          });
        }
        await tx.imageAsset.deleteMany({
          where: { legacyImageId: input.imageId },
        });

        const remaining = await tx.image.findMany({
          where: whereClause,
          orderBy: { order: "asc" },
          select: { id: true },
        });

        await Promise.all(
          remaining.map((img, index) =>
            Promise.all([
              tx.image.update({
                where: { id: img.id },
                data: { order: index },
              }),
              tx.imageAsset.updateMany({
                where: { legacyImageId: img.id },
                data: { order: index },
              }),
            ]),
          ),
        );
      });

      return { success: true } as const;
    }),
});
