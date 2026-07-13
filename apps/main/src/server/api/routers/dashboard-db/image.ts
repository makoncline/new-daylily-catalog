import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { APP_CONFIG } from "@/config/constants";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
import { imageContentTypeSchema, imageTypeSchema } from "@/types/image";
import type { db } from "@/server/db";
import {
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
import { captureServerPosthogEvent } from "@/server/analytics/posthog-server";
import { parseBooleanEnv } from "@/env";
import { reportError } from "@/lib/error-utils";
import { after } from "next/server";
import {
  assertOwnedListing,
  assertOwnedProfile,
  dashboardSyncInputSchema,
  parseDashboardSyncSince,
} from "./dashboard-db-router-helpers";

type DbClient = typeof db;
type DashboardImageRow = ReturnType<typeof mapImageRow>;

const MODERATION_MODEL = "omni-moderation-latest";
const MAX_IMAGE_DATA_URL_LENGTH =
  Math.ceil((APP_CONFIG.UPLOAD.MAX_FILE_SIZE * 4) / 3) + 100;

const moderationResponseSchema = z.object({
  results: z
    .array(
      z.object({
        categories: z.object({
          sexual: z.boolean(),
          "sexual/minors": z.boolean(),
        }),
        category_scores: z.object({
          sexual: z.number(),
          "sexual/minors": z.number(),
        }),
      }),
    )
    .min(1),
});

const imageModerationInputSchema = z.object({
  type: imageTypeSchema,
  contentType: imageContentTypeSchema,
  size: z.number().int().positive().max(APP_CONFIG.UPLOAD.MAX_FILE_SIZE),
  referenceId: z.string(),
  imageDataUrl: z.string().max(MAX_IMAGE_DATA_URL_LENGTH),
});

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

function decodeImageDataUrl(
  dataUrl: string,
  contentType: string,
  size: number,
) {
  const prefix = `data:${contentType};base64,`;
  if (!dataUrl.startsWith(prefix)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid image data",
    });
  }

  const buffer = Buffer.from(dataUrl.slice(prefix.length), "base64");
  if (buffer.byteLength !== size) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid image data",
    });
  }

  return buffer;
}

async function requestImageModeration(image: Buffer) {
  const apiKey = process.env.OPENAI_IMAGE_MODERATION_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_IMAGE_MODERATION_API_KEY is missing");
  const { default: sharp } = await import("sharp");

  let moderationImage: Buffer;
  try {
    const sourceImage = sharp(image, { animated: true, failOn: "error" });
    const metadata = await sourceImage.metadata();
    if ((metadata.pages ?? 1) > 1) {
      throw new InvalidModerationImageError(
        "Animated images are not supported",
      );
    }

    moderationImage = await sourceImage
      .rotate()
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
  } catch (error) {
    if (error instanceof InvalidModerationImageError) throw error;
    throw new InvalidModerationImageError("Invalid image", { cause: error });
  }

  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODERATION_MODEL,
      input: [
        {
          type: "image_url",
          image_url: {
            url: `data:image/webp;base64,${moderationImage.toString("base64")}`,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI moderation failed with status ${response.status}`);
  }

  const [result] = moderationResponseSchema.parse(
    await response.json(),
  ).results;
  if (!result) throw new Error("OpenAI moderation returned no result");
  return result;
}

class InvalidModerationImageError extends Error {}

async function moderateAndLogImage(args: {
  enforced: boolean;
  fileSize: number;
  image: Buffer;
  imageType: string;
  referenceId: string;
  userId: string;
}) {
  const startedAt = performance.now();
  let outcome: "approved" | "rejected" | "unavailable";
  let sexualScore: number | undefined;
  let sexualMinorsScore: number | undefined;
  let errorMessage: string | undefined;

  try {
    const result = await requestImageModeration(args.image);
    sexualScore = result.category_scores.sexual;
    sexualMinorsScore = result.category_scores["sexual/minors"];
    outcome =
      result.categories.sexual || result.categories["sexual/minors"]
        ? "rejected"
        : "approved";
  } catch (error) {
    outcome =
      error instanceof InvalidModerationImageError ? "rejected" : "unavailable";
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  const decision = args.enforced && outcome === "rejected" ? "reject" : "allow";
  const properties = {
    mode: args.enforced ? "enforce" : "shadow",
    outcome,
    decision,
    imageType: args.imageType,
    referenceId: args.referenceId,
    fileSize: args.fileSize,
    model: MODERATION_MODEL,
    sexualScore,
    sexualMinorsScore,
  } as const;

  console.info(
    JSON.stringify({
      event: "image_moderation",
      userId: args.userId,
      ...properties,
      durationMs: Math.round(performance.now() - startedAt),
      errorMessage,
    }),
  );

  if (outcome === "unavailable") {
    reportError({
      error: new Error("Image moderation unavailable"),
      context: {
        source: "imageModeration",
        mode: properties.mode,
        imageType: args.imageType,
        referenceId: args.referenceId,
        userId: args.userId,
        providerError: errorMessage,
      },
    });
  }

  if (outcome !== "approved") {
    after(() => {
      return captureServerPosthogEvent({
        distinctId: args.userId,
        event: `image_moderation_${outcome}`,
        properties,
      });
    });
  }

  return { outcome, sexualScore } as const;
}

async function assertOwnedImageTarget(args: {
  db: DbClient;
  referenceId: string;
  type: "listing" | "profile";
  userId: string;
}) {
  if (args.type === "listing") {
    await assertOwnedListing({
      db: args.db,
      listingId: args.referenceId,
      userId: args.userId,
    });
  } else {
    await assertOwnedProfile({
      db: args.db,
      userId: args.userId,
      userProfileId: args.referenceId,
    });
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
  if (args.rows.length === 0) {
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
  moderateImage: protectedProcedure
    .input(imageModerationInputSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOwnedImageTarget({
        db: ctx.db,
        referenceId: input.referenceId,
        type: input.type,
        userId: ctx.user.id,
      });
      const image = decodeImageDataUrl(
        input.imageDataUrl,
        input.contentType,
        input.size,
      );

      return moderateAndLogImage({
        enforced: false,
        fileSize: input.size,
        image,
        imageType: input.type,
        referenceId: input.referenceId,
        userId: ctx.user.id,
      });
    }),

  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        contentType: imageContentTypeSchema,
        size: z.number().int().positive().max(APP_CONFIG.UPLOAD.MAX_FILE_SIZE),
        referenceId: z.string(),
        imageDataUrl: z.string().max(MAX_IMAGE_DATA_URL_LENGTH).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnedImageTarget({
        db: ctx.db,
        referenceId: input.referenceId,
        type: input.type,
        userId: ctx.user.id,
      });

      let contentMd5: string | undefined;
      const moderationEnabled = Boolean(
        process.env.OPENAI_IMAGE_MODERATION_API_KEY?.trim(),
      );
      const moderationEnforced =
        moderationEnabled &&
        parseBooleanEnv(process.env.IMAGE_MODERATION_ENFORCED);
      if (moderationEnforced) {
        if (!input.imageDataUrl) {
          return { moderationRequired: true } as const;
        }

        const image = decodeImageDataUrl(
          input.imageDataUrl,
          input.contentType,
          input.size,
        );
        const result = await moderateAndLogImage({
          enforced: true,
          fileSize: input.size,
          image,
          imageType: input.type,
          referenceId: input.referenceId,
          userId: ctx.user.id,
        });

        if (result.outcome === "rejected") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "We couldn't accept this image. Please choose another.",
          });
        }

        contentMd5 = crypto.createHash("md5").update(image).digest("base64");
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
        contentMd5,
      });

      const command = new PutObjectCommand({
        Bucket: getLegacyImageUploadBucketName(),
        Key: key,
        ContentType: input.contentType,
        ContentLength: input.size,
        ContentMD5: contentMd5,
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
        contentMd5,
        shadowModerationRequested: moderationEnabled && !moderationEnforced,
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
