import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import crypto from "crypto";
import { env } from "@/env";
import { APP_CONFIG } from "@/config/constants";
import { imageTypeSchema } from "@/types/image";

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export const imageRouter = createTRPCRouter({
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
      try {
        // Get file extension
        const ext = path.extname(input.fileName);

        // Generate a unique ID for the file
        const fileId = crypto.randomBytes(4).toString("hex");

        // Construct the key based on the type
        const key = `${ctx.user.id}/${input.referenceId}/${fileId}${ext}`;

        const command = new PutObjectCommand({
          Bucket: env.AWS_BUCKET_NAME,
          Key: key,
          ContentType: input.contentType,
        });

        const url = await getSignedUrl(s3Client, command, {
          expiresIn: 3600, // 1 hour
        });

        return {
          presignedUrl: url,
          key,
          url: `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
        };
      } catch (error) {
        console.error("Error generating presigned URL:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate presigned URL",
        });
      }
    }),

  uploadImage: protectedProcedure
    .input(
      z.object({
        key: z.string(),
        type: imageTypeSchema,
        listingId: z.string().optional(),
        userProfileId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return {
          success: true,
          url: `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${input.key}`,
        };
      } catch {
        console.error("Error uploading image");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload image",
        });
      }
    }),

  reorderImages: protectedProcedure
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
      try {
        // Determine where clause based on type
        const whereClause =
          input.type === "listing"
            ? { listingId: input.referenceId }
            : { userProfileId: input.referenceId };

        // Retrieve all images for the given reference
        const allImages = await ctx.db.image.findMany({
          where: whereClause,
          orderBy: { order: "asc" },
        });

        // Merge new order with any images not included in the input
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

        // Update all images in a single transaction
        await ctx.db.$transaction(
          mergedOrder.map((img, index) =>
            ctx.db.image.update({
              where: { id: img.id },
              data: { order: index },
            }),
          ),
        );

        return { success: true };
      } catch (err) {
        console.error("Error reordering images:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reorder images",
        });
      }
    }),

  deleteImage: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        referenceId: z.string(),
        imageId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Determine where clause based on type
        const whereClause =
          input.type === "listing"
            ? { listingId: input.referenceId }
            : { userProfileId: input.referenceId };

        await ctx.db.$transaction(async (tx) => {
          // Delete the image
          await tx.image.delete({
            where: { id: input.imageId },
          });

          // Get remaining images and update their order
          const remainingImages = await tx.image.findMany({
            where: whereClause,
            orderBy: { order: "asc" },
          });

          // Update each image with its new sequential order
          await Promise.all(
            remainingImages.map((img, index) =>
              tx.image.update({
                where: { id: img.id },
                data: { order: index },
              }),
            ),
          );
        });

        return { success: true };
      } catch (error) {
        console.error("Error deleting image:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete image",
        });
      }
    }),

  createImage: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        referenceId: z.string(),
        url: z.string(),
        key: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Determine where clause based on type
        const whereClause =
          input.type === "listing"
            ? { listingId: input.referenceId }
            : { userProfileId: input.referenceId };

        // Get current count of images
        const currentCount = await ctx.db.image.count({
          where: whereClause,
        });

        // Create the image with the correct reference and order
        const image = await ctx.db.image.create({
          data: {
            url: input.url,
            order: currentCount,
            ...(input.type === "listing"
              ? { listingId: input.referenceId }
              : { userProfileId: input.referenceId }),
          },
        });

        return image;
      } catch (error) {
        console.error("Error creating image:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create image",
        });
      }
    }),
});
