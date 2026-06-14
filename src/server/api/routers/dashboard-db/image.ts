import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { after } from "next/server";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { env, requireEnv } from "@/env";
import { APP_CONFIG } from "@/config/constants";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { spawn } from "node:child_process";
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
  invalidateDashboardMutation,
  parseDashboardSyncSince,
} from "./dashboard-db-router-helpers";
import {
  buildImageAssetMap,
  resolveImageAssetUrl,
} from "@/server/services/image-asset-read-model";
import {
  areImageAssetUploadsConfigured,
  buildOriginalImageAssetKey,
  buildR2PublicUrl,
  getR2PresignedPutUrl,
  areImageAssetsEnabled,
  isExpectedOriginalImageAssetKey,
} from "@/server/services/image-asset-storage";

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

async function resolveDashboardImageRows(args: {
  db: DbClient;
  rows: Array<{
    id: string;
    url: string;
    order: number;
    listingId: string | null;
    userProfileId: string | null;
    createdAt: Date;
    updatedAt: Date;
    status: string | null;
  }>;
}) {
  if (!areImageAssetsEnabled() || args.rows.length === 0) {
    return args.rows;
  }

  const assets = await args.db.imageAsset.findMany({
    where: {
      OR: [
        { legacyImageId: { in: args.rows.map((row) => row.id) } },
        { id: { in: args.rows.map((row) => row.id) } },
      ],
    },
    select: {
      id: true,
      legacyImageId: true,
      originalUrl: true,
      displayUrl: true,
      thumbUrl: true,
      blurUrl: true,
    },
  });
  const imageAssetByLegacyId = buildImageAssetMap(assets);

  return args.rows.map((row) => ({
    ...row,
    url: resolveImageAssetUrl({
      image: row,
      imageAssetByLegacyId,
      variant: "thumb",
      source: "dashboardDb.image",
    }),
  }));
}

function scheduleImageAssetVariantProcessing(imageAssetId: string) {
  after(async () => {
    await new Promise<void>((resolve) => {
      const child = spawn(
        process.execPath,
        [
          "scripts/image-assets/process-image-asset-variants.mjs",
          "--asset-id",
          imageAssetId,
          "--limit",
          "1",
        ],
        {
          cwd: process.cwd(),
          env: process.env,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      child.stdout.on("data", (chunk: Buffer) => {
        console.log("[image-assets:variants]", chunk.toString().trim());
      });
      child.stderr.on("data", (chunk: Buffer) => {
        console.error("[image-assets:variants]", chunk.toString().trim());
      });
      child.on("error", (error) => {
        console.error("[image-assets:variants] failed to start", {
          imageAssetId,
          error,
        });
        resolve();
      });
      child.on("close", (code) => {
        if (code !== 0) {
          console.error("[image-assets:variants] exited non-zero", {
            imageAssetId,
            code,
          });
        }
        resolve();
      });
    });
  });
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

      const imageId = input.imageId ?? crypto.randomUUID();
      const ext = path.extname(input.fileName);
      const fileId = crypto.randomBytes(4).toString("hex");
      const key = `${ctx.user.id}/${input.referenceId}/${fileId}${ext}`;
      const shouldPresignR2 = areImageAssetUploadsConfigured();
      const r2VersionId = input.imageId
        ? crypto.randomBytes(6).toString("hex")
        : null;
      const r2OriginalKey = shouldPresignR2
        ? buildOriginalImageAssetKey({
            kind: input.type,
            userId: ctx.user.id,
            listingId: input.type === "listing" ? input.referenceId : null,
            imageAssetId: imageId,
            versionId: r2VersionId,
            fileName: input.fileName,
          })
        : null;

      const command = new PutObjectCommand({
        Bucket: requireEnv("AWS_BUCKET_NAME", env.AWS_BUCKET_NAME),
        Key: key,
        ContentType: input.contentType,
      });

      const bucketName = requireEnv("AWS_BUCKET_NAME", env.AWS_BUCKET_NAME);
      const region = requireEnv("AWS_REGION", env.AWS_REGION);
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      const r2PresignedUrl = r2OriginalKey
        ? await getR2PresignedPutUrl({
            key: r2OriginalKey,
            contentType: input.contentType,
          })
        : null;

      return {
        imageId,
        presignedUrl: url,
        key,
        url: `https://${bucketName}.s3.${region}.amazonaws.com/${key}`,
        r2:
          r2OriginalKey && r2PresignedUrl
            ? {
                presignedUrl: r2PresignedUrl,
                key: r2OriginalKey,
                url: buildR2PublicUrl(r2OriginalKey),
              }
            : null,
      } as const;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.image.findMany({
      where: {
        OR: [
          { listing: { userId: ctx.user.id } },
          { userProfile: { userId: ctx.user.id } },
        ],
      },
      orderBy: [
        { listingId: "asc" },
        { userProfileId: "asc" },
        { order: "asc" },
      ],
      select: imageSelect,
    });

    return resolveDashboardImageRows({ db: ctx.db, rows });
  }),

  sync: protectedProcedure
    .input(z.object({ since: z.iso.datetime().nullable() }))
    .query(async ({ ctx, input }) => {
      const since = parseDashboardSyncSince(input.since);
      const rows = await ctx.db.image.findMany({
        where: {
          OR: [
            { listing: { userId: ctx.user.id } },
            { userProfile: { userId: ctx.user.id } },
          ],
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        orderBy: { updatedAt: "asc" },
        select: imageSelect,
      });

      return resolveDashboardImageRows({ db: ctx.db, rows });
    }),

  create: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        referenceId: z.string(),
        url: z.string().min(1),
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

      const whereClause =
        input.type === "listing"
          ? { listingId: input.referenceId }
          : { userProfileId: input.referenceId };

      const currentCount = await ctx.db.image.count({ where: whereClause });
      const shouldCreateImageAsset = Boolean(input.r2OriginalKey);

      if (input.r2OriginalKey) {
        if (!input.imageId || !areImageAssetUploadsConfigured()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Image asset upload metadata is invalid",
          });
        }

        const isExpectedKey = isExpectedOriginalImageAssetKey({
          kind: input.type,
          userId: ctx.user.id,
          listingId: input.type === "listing" ? input.referenceId : null,
          imageAssetId: input.imageId,
          key: input.r2OriginalKey,
        });

        if (!isExpectedKey) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Image asset upload metadata is invalid",
          });
        }
      }

      const image = await ctx.db.$transaction(async (tx) => {
        const created = await tx.image.create({
          data: {
            ...(input.imageId ? { id: input.imageId } : {}),
            url: input.url,
            order: currentCount,
            ...(input.type === "listing"
              ? { listingId: input.referenceId }
              : { userProfileId: input.referenceId }),
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
              ...(input.type === "listing"
                ? { listingId: input.referenceId }
                : { userProfileId: input.referenceId }),
            },
          });
        }

        return created;
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

      const [resolved] = await resolveDashboardImageRows({
        db: ctx.db,
        rows: [image],
      });

      if (shouldCreateImageAsset) {
        scheduleImageAssetVariantProcessing(image.id);
      }

      return resolved ?? image;
    }),

  update: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        referenceId: z.string(),
        imageId: z.string(),
        url: z.string().min(1),
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

      if (input.r2OriginalKey) {
        if (!areImageAssetUploadsConfigured()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Image asset upload metadata is invalid",
          });
        }

        const isExpectedKey = isExpectedOriginalImageAssetKey({
          kind: input.type,
          userId: ctx.user.id,
          listingId: input.type === "listing" ? input.referenceId : null,
          imageAssetId: input.imageId,
          key: input.r2OriginalKey,
          requireVersion: true,
        });

        if (!isExpectedKey) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Image asset upload metadata is invalid",
          });
        }
      }

      const image = await ctx.db.$transaction(async (tx) => {
        const updated = await tx.image.update({
          where: { id: input.imageId },
          data: { url: input.url },
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
              ...(input.type === "listing"
                ? { listingId: input.referenceId }
                : { userProfileId: input.referenceId }),
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
              ...(input.type === "listing"
                ? { listingId: input.referenceId, userProfileId: null }
                : { listingId: null, userProfileId: input.referenceId }),
            },
          });
        } else {
          await tx.imageAsset.deleteMany({
            where: { legacyImageId: input.imageId },
          });
        }

        return updated;
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

      const [resolved] = await resolveDashboardImageRows({
        db: ctx.db,
        rows: [image],
      });

      if (input.r2OriginalKey) {
        scheduleImageAssetVariantProcessing(image.id);
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
