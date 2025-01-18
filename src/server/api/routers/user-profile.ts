import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { TRPCError } from "@trpc/server";
import { type Prisma } from "@prisma/client";

const profileInclude = {
  images: {
    orderBy: {
      order: "asc" as const,
    },
  },
} satisfies Prisma.UserProfileInclude;

export const userProfileRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    try {
      const profile = await db.userProfile.findUnique({
        where: { userId: ctx.user.id },
        include: profileInclude,
      });

      if (!profile) {
        // Create a new profile if one doesn't exist
        return db.userProfile.create({
          data: {
            userId: ctx.user.id,
          },
          include: profileInclude,
        });
      }

      return profile;
    } catch (error) {
      console.error("Error getting user profile:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error getting user profile",
      });
    }
  }),

  update: protectedProcedure
    .input(
      z.object({
        data: z.object({
          intro: z.string().optional().nullable(),
          bio: z.string().optional().nullable(),
          userLocation: z.string().optional().nullable(),
          logoUrl: z.string().optional().nullable(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const profile = await db.userProfile.upsert({
          where: { userId: ctx.user.id },
          create: {
            userId: ctx.user.id,
            ...input.data,
          },
          update: input.data,
          include: profileInclude,
        });

        revalidatePath("/dashboard/profile");

        return profile;
      } catch (error) {
        console.error("Error updating user profile:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error updating user profile",
        });
      }
    }),

  updateImages: protectedProcedure
    .input(
      z.object({
        images: z.array(
          z.object({
            id: z.string(),
            order: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the profile
        const profile = await db.userProfile.findUnique({
          where: { userId: ctx.user.id },
          include: { images: true },
        });

        if (!profile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profile not found",
          });
        }

        // Update image orders in a transaction
        await db.$transaction(
          input.images.map((image) =>
            db.image.update({
              where: {
                id: image.id,
                userProfileId: profile.id,
              },
              data: {
                order: image.order,
              },
            }),
          ),
        );

        // Return updated profile
        return db.userProfile.findUnique({
          where: { userId: ctx.user.id },
          include: profileInclude,
        });
      } catch (error) {
        console.error("Error updating profile images:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error updating profile images",
        });
      }
    }),
});
