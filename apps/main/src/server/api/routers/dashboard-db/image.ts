import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { env, requireEnv } from "@/env";
import { APP_CONFIG } from "@/config/constants";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
import {
  imageContentTypeSchema,
  imageExtensionByContentType,
  imageTypeSchema,
  type ImageType,
} from "@/types/image";
import type { db } from "@/server/db";
import {
  areImageAssetsEnabled,
  buildImageAssetMap,
  imageAssetUrlSelect,
  resolveImageAssetUrl,
} from "@/server/services/image-asset-read-model";
import {
  buildR2PublicUrl,
  getR2OriginalUploadMetadata,
  isExpectedOriginalImageAssetKey,
} from "@/server/services/image-asset-storage";
import {
  assertOwnedListing,
  assertOwnedProfile,
  dashboardSyncInputSchema,
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

function compareNullableStrings(a: string | null, b: string | null) {
  return (a ?? "").localeCompare(b ?? "");
}

function sortImagesForDashboard(
  a: ReturnType<typeof mapImageRow>,
  b: ReturnType<typeof mapImageRow>,
) {
  return (
    compareNullableStrings(a.listingId, b.listingId) ||
    compareNullableStrings(a.userProfileId, b.userProfileId) ||
    a.order - b.order ||
    a.id.localeCompare(b.id)
  );
}

function getUploadBucketName() {
  return requireEnv("AWS_BUCKET_NAME", env.AWS_BUCKET_NAME);
}

function getUploadRegion() {
  return requireEnv("AWS_REGION", env.AWS_REGION);
}

function getS3ImageUrl(key: string) {
  return `https://${getUploadBucketName()}.s3.${getUploadRegion()}.amazonaws.com/${key}`;
}

function ownerWhere(type: ImageType, referenceId: string) {
  return type === "listing"
    ? { listingId: referenceId }
    : { userProfileId: referenceId };
}

function ownerReset(type: ImageType, referenceId: string) {
  return type === "listing"
    ? { listingId: referenceId, userProfileId: null }
    : { listingId: null, userProfileId: referenceId };
}

function listingIdForImageAsset(type: ImageType, referenceId: string) {
  return type === "listing" ? referenceId : null;
}

function invalidImageAssetMetadata() {
  return new TRPCError({
    code: "BAD_REQUEST",
    message: "Image asset upload metadata is invalid",
  });
}

function assertUploadKeyMatchesTarget(args: {
  key: string;
  referenceId: string;
  userId: string;
}) {
  const prefix = `${args.userId}/${args.referenceId}/`;
  const hasAllowedExtension = Object.values(imageExtensionByContentType).some(
    (extension) => args.key.endsWith(extension),
  );

  if (!args.key.startsWith(prefix) || !hasAllowedExtension) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid image upload key",
    });
  }
}

function parseS3ImageKey(url: string) {
  try {
    const parsed = new URL(url);
    const expectedHost = `${getUploadBucketName()}.s3.${getUploadRegion()}.amazonaws.com`;

    if (parsed.protocol !== "https:" || parsed.host !== expectedHost) {
      return null;
    }

    return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

function getValidatedImageUrl(args: {
  key: string;
  referenceId: string;
  url: string;
  userId: string;
}) {
  assertUploadKeyMatchesTarget({
    key: args.key,
    referenceId: args.referenceId,
    userId: args.userId,
  });

  const parsedKey = parseS3ImageKey(args.url);
  if (parsedKey !== args.key || args.url !== getS3ImageUrl(args.key)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid image upload URL",
    });
  }

  return getS3ImageUrl(args.key);
}

function getValidatedImageUrlFromUrl(args: {
  referenceId: string;
  url: string;
  userId: string;
}) {
  const key = parseS3ImageKey(args.url);
  if (!key) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid image upload URL",
    });
  }

  return getValidatedImageUrl({ ...args, key });
}

function assertR2OriginalKeyMatchesTarget(args: {
  type: ImageType;
  referenceId: string;
  userId: string;
  imageAssetId: string;
  key: string;
  requireVersion?: boolean;
}) {
  const isExpectedKey = isExpectedOriginalImageAssetKey({
    kind: args.type,
    userId: args.userId,
    listingId: listingIdForImageAsset(args.type, args.referenceId),
    imageAssetId: args.imageAssetId,
    key: args.key,
    requireVersion: args.requireVersion,
  });

  if (!isExpectedKey) {
    throw invalidImageAssetMetadata();
  }
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
    select: {
      ...imageAssetUrlSelect,
    },
  });
  const imageAssetByLegacyId = buildImageAssetMap(assets);

  return args.rows.map((row) => ({
    ...row,
    url: resolveImageAssetUrl({
      image: row,
      imageAssetByLegacyId,
      variant: "thumb",
    }),
  }));
}

export const dashboardDbImageRouter = createTRPCRouter({
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        contentType: imageContentTypeSchema,
        size: z.number().int().positive().max(APP_CONFIG.UPLOAD.MAX_FILE_SIZE),
        referenceId: z.string(),
        imageId: z.string().optional(),
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

      const ext = imageExtensionByContentType[input.contentType];
      const imageId = input.imageId ?? crypto.randomUUID();
      const fileId = crypto.randomBytes(16).toString("hex");
      const key = `${ctx.user.id}/${input.referenceId}/${fileId}${ext}`;
      const r2VersionId = input.imageId
        ? crypto.randomBytes(6).toString("hex")
        : null;
      const r2 = await getR2OriginalUploadMetadata({
        kind: input.type,
        userId: ctx.user.id,
        listingId: listingIdForImageAsset(input.type, input.referenceId),
        imageAssetId: imageId,
        versionId: r2VersionId,
        contentType: input.contentType,
      });

      const command = new PutObjectCommand({
        Bucket: getUploadBucketName(),
        Key: key,
        ContentType: input.contentType,
        ContentLength: input.size,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

      return {
        imageId,
        presignedUrl: url,
        key,
        url: getS3ImageUrl(key),
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

      const imageUrl = getValidatedImageUrl({
        key: input.key,
        referenceId: input.referenceId,
        url: input.url,
        userId: ctx.user.id,
      });

      const whereClause = ownerWhere(input.type, input.referenceId);

      const currentCount = await ctx.db.image.count({ where: whereClause });
      const shouldCreateImageAsset = Boolean(input.r2OriginalKey);

      if (input.r2OriginalKey) {
        if (!input.imageId) {
          throw invalidImageAssetMetadata();
        }

        assertR2OriginalKeyMatchesTarget({
          type: input.type,
          referenceId: input.referenceId,
          userId: ctx.user.id,
          imageAssetId: input.imageId,
          key: input.r2OriginalKey,
        });
      }

      const image = await ctx.db.$transaction(async (tx) => {
        const created = await tx.image.create({
          data: {
            ...(input.imageId ? { id: input.imageId } : {}),
            url: imageUrl,
            order: currentCount,
            ...whereClause,
          },
          select: imageSelect,
        });

        if (shouldCreateImageAsset && input.r2OriginalKey) {
          await tx.imageAsset.create({
            data: {
              id: created.id,
              legacyImageId: created.id,
              kind: input.type,
              order: currentCount,
              status: "pending_variants",
              originalKey: input.r2OriginalKey,
              originalUrl: buildR2PublicUrl(input.r2OriginalKey),
              ...whereClause,
            },
          });
        }

        return created;
      });

      const [resolved] = await resolveDashboardImageRows({
        db: ctx.db,
        rows: [image],
      });

      return resolved ?? image;
    }),

  update: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        referenceId: z.string(),
        imageId: z.string(),
        url: z.url(),
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

      const imageUrl = getValidatedImageUrlFromUrl({
        referenceId: input.referenceId,
        url: input.url,
        userId: ctx.user.id,
      });

      if (input.r2OriginalKey) {
        assertR2OriginalKeyMatchesTarget({
          type: input.type,
          referenceId: input.referenceId,
          userId: ctx.user.id,
          imageAssetId: input.imageId,
          key: input.r2OriginalKey,
          requireVersion: true,
        });
      }

      const image = await ctx.db.$transaction(async (tx) => {
        const updated = await tx.image.update({
          where: { id: input.imageId },
          data: { url: imageUrl },
          select: imageSelect,
        });

        if (input.r2OriginalKey) {
          await tx.imageAsset.upsert({
            where: { legacyImageId: input.imageId },
            create: {
              id: input.imageId,
              legacyImageId: input.imageId,
              kind: input.type,
              order: updated.order,
              status: "pending_variants",
              originalKey: input.r2OriginalKey,
              originalUrl: buildR2PublicUrl(input.r2OriginalKey),
              ...ownerWhere(input.type, input.referenceId),
            },
            update: {
              kind: input.type,
              order: updated.order,
              status: "pending_variants",
              originalKey: input.r2OriginalKey,
              originalUrl: buildR2PublicUrl(input.r2OriginalKey),
              displayKey: null,
              displayUrl: null,
              thumbKey: null,
              thumbUrl: null,
              blurKey: null,
              blurUrl: null,
              ...ownerReset(input.type, input.referenceId),
            },
          });
        } else {
          await tx.imageAsset.deleteMany({
            where: { legacyImageId: input.imageId },
          });
        }

        return updated;
      });

      const [resolved] = await resolveDashboardImageRows({
        db: ctx.db,
        rows: [image],
      });

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

      const whereClause = ownerWhere(input.type, input.referenceId);

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

      const whereClause = ownerWhere(input.type, input.referenceId);

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
