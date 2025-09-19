import { protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import crypto from "crypto";
import { env } from "@/env";
import { APP_CONFIG } from "@/config/constants";

export const imagesProcedures = {
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        fileName: z.string(),
        contentType: z.string(),
        size: z.number().max(APP_CONFIG.UPLOAD.MAX_FILE_SIZE),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validate ownership
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.listingId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!listing) throw new Error("Listing not found or not owned by user");

      const s3Client = new S3Client({
        region: env.AWS_REGION,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const ext = path.extname(input.fileName);
      const fileId = crypto.randomBytes(4).toString("hex");
      const key = `${ctx.user.id}/${input.listingId}/${fileId}${ext}`;

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
  getImages: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.image.findMany({
      where: {
        listing: { userId: ctx.user.id },
      },
      orderBy: [{ listingId: "asc" }, { order: "asc" }],
      select: { id: true, url: true, order: true, listingId: true },
    });
  }),

  syncImages: protectedProcedure
    .input(z.object({ since: z.iso.datetime().nullable() }))
    .query(async ({ ctx, input }) => {
      const since = input.since ? new Date(input.since) : undefined;
      const upserts = await ctx.db.image.findMany({
        where: {
          listing: { userId: ctx.user.id },
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        orderBy: { updatedAt: "asc" },
        select: { id: true, url: true, order: true, listingId: true },
      });
      // NOTE: Does not include deletions
      return upserts;
    }),

  createImage: protectedProcedure
    .input(z.object({ listingId: z.string(), url: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Ensure listing belongs to user
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.listingId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!listing) throw new Error("Listing not found or not owned by user");

      const currentCount = await ctx.db.image.count({
        where: { listingId: input.listingId },
      });

      const image = await ctx.db.image.create({
        data: {
          url: input.url,
          order: currentCount,
          listingId: input.listingId,
        },
        select: { id: true, url: true, order: true, listingId: true },
      });
      return image;
    }),

  reorderImages: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        images: z
          .array(z.object({ id: z.string(), order: z.number().int().min(0) }))
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validate listing ownership
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.listingId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!listing) throw new Error("Listing not found or not owned by user");

      // Update provided images; any others will maintain their order
      const results = await ctx.db.$transaction(
        input.images.map((img) =>
          ctx.db.image.updateMany({
            where: {
              id: img.id,
              listingId: input.listingId,
              listing: { userId: ctx.user.id },
            },
            data: { order: img.order, updatedAt: new Date() },
          }),
        ),
      );
      // If any update didn't match (0), something is off.
      if (results.some((r) => r.count === 0)) {
        throw new Error("One or more images not found or not owned by user");
      }
      return { success: true } as const;
    }),

  deleteImage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Ensure image belongs to a listing owned by user and capture listingId
      const image = await ctx.db.image.findFirst({
        where: { id: input.id, listing: { userId: ctx.user.id } },
        select: { id: true, listingId: true },
      });
      if (!image || !image.listingId)
        throw new Error("Image not found or not owned by user");

      const deleted = await ctx.db.image.delete({ where: { id: input.id } });

      // Re-number remaining images for that listing to keep a dense order
      const remaining = await ctx.db.image.findMany({
        where: { listingId: image.listingId },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      await ctx.db.$transaction(
        remaining.map((img, index) =>
          ctx.db.image.update({
            where: { id: img.id },
            data: { order: index, updatedAt: new Date() },
          }),
        ),
      );

      return deleted;
    }),
} as const;
