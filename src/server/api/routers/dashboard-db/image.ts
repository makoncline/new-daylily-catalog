import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { env } from "@/env";
import { APP_CONFIG } from "@/config/constants";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
import path from "node:path";
import { imageTypeSchema } from "@/types/image";
import type { db } from "@/server/db";

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
type OwnedContext = { db: DbClient; user: { id: string } };

async function assertListingOwned(ctx: OwnedContext, listingId: string) {
  const listing = await ctx.db.listing.findFirst({
    where: { id: listingId, userId: ctx.user.id },
    select: { id: true },
  });
  if (!listing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Listing not found",
    });
  }
}

async function assertProfileOwned(ctx: OwnedContext, userProfileId: string) {
  const profile = await ctx.db.userProfile.findFirst({
    where: { id: userProfileId, userId: ctx.user.id },
    select: { id: true },
  });
  if (!profile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Profile not found",
    });
  }
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
        await assertListingOwned(ctx, input.referenceId);
      } else {
        await assertProfileOwned(ctx, input.referenceId);
      }

      const s3Client = new S3Client({
        region: env.AWS_REGION,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const ext = path.extname(input.fileName);
      const fileId = crypto.randomBytes(4).toString("hex");
      const key = `${ctx.user.id}/${input.referenceId}/${fileId}${ext}`;

      const command = new PutObjectCommand({
        Bucket: env.AWS_BUCKET_NAME,
        Key: key,
        ContentType: input.contentType,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

      return {
        presignedUrl: url,
        key,
        url: `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
      } as const;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.image.findMany({
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
  }),

  sync: protectedProcedure
    .input(z.object({ since: z.iso.datetime().nullable() }))
    .query(async ({ ctx, input }) => {
      const since = input.since ? new Date(input.since) : undefined;
      return ctx.db.image.findMany({
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
        await assertListingOwned(ctx, input.referenceId);
      } else {
        await assertProfileOwned(ctx, input.referenceId);
      }

      const whereClause =
        input.type === "listing"
          ? { listingId: input.referenceId }
          : { userProfileId: input.referenceId };

      const currentCount = await ctx.db.image.count({ where: whereClause });

      return ctx.db.image.create({
        data: {
          url: input.url,
          order: currentCount,
          ...(input.type === "listing"
            ? { listingId: input.referenceId }
            : { userProfileId: input.referenceId }),
        },
        select: imageSelect,
      });
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
        await assertListingOwned(ctx, input.referenceId);
      } else {
        await assertProfileOwned(ctx, input.referenceId);
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
        await assertListingOwned(ctx, input.referenceId);
      } else {
        await assertProfileOwned(ctx, input.referenceId);
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

      return { success: true } as const;
    }),
});
