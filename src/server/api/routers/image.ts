import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import crypto from "crypto";
import { env } from "@/env";
import { APP_CONFIG } from "@/config/constants";

const imageTypeSchema = z.enum(["listing", "profile"]);

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
        listingId: z.string().optional(),
        userProfileId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get file extension
        const ext = path.extname(input.fileName);

        // Generate a unique ID for the file
        const fileId = crypto.randomBytes(4).toString("hex");

        // Construct the key based on the type
        const key =
          input.type === "listing"
            ? `${ctx.user.id}/${input.listingId}/${fileId}${ext}`
            : `${ctx.user.id}/${fileId}${ext}`;

        const command = new PutObjectCommand({
          Bucket: env.AWS_BUCKET_NAME,
          Key: key,
          ContentType: input.contentType,
        });

        const presignedUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 3600,
        });

        // Construct the full S3 URL
        const imageUrl = `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

        return {
          presignedUrl,
          key,
          url: imageUrl,
        };
      } catch (error) {
        console.error("Failed to generate presigned URL:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate upload URL",
          cause: error,
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
    .mutation(async ({ ctx, input }) => {
      try {
        // Validate that at least one ID is provided based on type
        if (input.type === "listing" && !input.listingId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Listing ID is required for listing images",
          });
        }
        if (input.type === "profile" && !input.userProfileId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User profile ID is required for profile images",
          });
        }

        // Get the current highest order for the given listing/profile
        const maxOrder = await ctx.db.image.findFirst({
          where: {
            ...(input.listingId ? { listingId: input.listingId } : {}),
            ...(input.userProfileId
              ? { userProfileId: input.userProfileId }
              : {}),
          },
          orderBy: {
            order: "desc",
          },
          select: {
            order: true,
          },
        });

        // Construct the full S3 URL
        const imageUrl = `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${input.key}`;

        const image = await ctx.db.image.create({
          data: {
            url: imageUrl,
            order: (maxOrder?.order ?? -1) + 1,
            listingId: input.listingId,
            userProfileId: input.userProfileId,
          },
        });

        return {
          success: true,
          url: image.url,
        };
      } catch (error) {
        console.error("Failed to create image record:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create image record",
          cause: error,
        });
      }
    }),

  reorderImages: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        images: z.array(
          z.object({
            id: z.string(),
            order: z.number().int().min(0),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await Promise.all(
          input.images.map((img) =>
            ctx.db.image.update({
              where: { id: img.id },
              data: { order: img.order },
            }),
          ),
        );

        return { success: true };
      } catch (error) {
        console.error("Failed to reorder images:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reorder images",
          cause: error,
        });
      }
    }),

  deleteImage: protectedProcedure
    .input(
      z.object({
        type: imageTypeSchema,
        imageId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.image.delete({
          where: { id: input.imageId },
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to delete image:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete image",
          cause: error,
        });
      }
    }),
});
