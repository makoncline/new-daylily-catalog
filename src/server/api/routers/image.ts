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

        const url = await getSignedUrl(s3Client, command, {
          expiresIn: 3600, // 1 hour
        });

        // Get the current highest order value for this listing
        let nextOrder = 0;
        if (input.listingId) {
          const lastImage = await ctx.db.image.findFirst({
            where: { listingId: input.listingId },
            orderBy: { order: "desc" },
          });
          nextOrder = lastImage ? lastImage.order + 1 : 0;
        }

        // Create the image record
        const image = await ctx.db.image.create({
          data: {
            url: `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
            order: nextOrder,
            ...(input.type === "listing"
              ? { listingId: input.listingId }
              : { userProfileId: input.userProfileId }),
          },
        });

        return {
          presignedUrl: url,
          imageId: image.id,
          url: image.url,
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
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the current highest order value for this listing
        let nextOrder = 0;
        if (input.listingId) {
          const lastImage = await ctx.db.image.findFirst({
            where: { listingId: input.listingId },
            orderBy: { order: "desc" },
          });
          nextOrder = lastImage ? lastImage.order + 1 : 0;
        }

        const image = await ctx.db.image.create({
          data: {
            url: `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${input.key}`,
            order: nextOrder,
            ...(input.type === "listing"
              ? { listingId: input.listingId }
              : { userProfileId: input.userProfileId }),
          },
        });

        return {
          success: true,
          url: image.url,
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
        images: z.array(z.object({ id: z.string(), order: z.number() })),
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
      } catch {
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
        imageId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.image.delete({
          where: { id: input.imageId },
        });
        return { success: true };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete image",
        });
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        type: z.enum(["listing", "profile"]),
        listingId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the current highest order value for this listing
      let nextOrder = 0;
      if (input.listingId) {
        const lastImage = await ctx.db.image.findFirst({
          where: { listingId: input.listingId },
          orderBy: { order: "desc" },
        });
        nextOrder = lastImage ? lastImage.order + 1 : 0;
      }

      return ctx.db.image.create({
        data: {
          url: input.url,
          order: nextOrder,
          listing: input.listingId
            ? { connect: { id: input.listingId } }
            : undefined,
          userProfile: !input.listingId
            ? { connect: { userId: ctx.user.id } }
            : undefined,
        },
      });
    }),
});
