import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { TRPCError } from "@trpc/server";
import { type Prisma } from "@prisma/client";
import { slugSchema } from "@/types/schemas/profile";
import { isValidSlug } from "@/lib/utils/slugify";

const profileInclude = {
  images: {
    orderBy: {
      order: "asc" as const,
    },
  },
} satisfies Prisma.UserProfileInclude;

async function checkSlugAvailability(slug: string | null, userId: string) {
  // If slug is null or the user's ID, it's valid
  if (!slug || slug === userId) {
    return true;
  }

  // Validate the slug format
  if (!isValidSlug(slug)) {
    return false;
  }

  // Check if slug is already taken by another user
  const existingProfile = await db.userProfile.findFirst({
    where: {
      slug,
      NOT: {
        userId,
      },
    },
  });

  return !existingProfile;
}

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
            slug: ctx.user.id, // Use userId as default slug
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

  checkSlug: protectedProcedure
    .input(
      z.object({
        slug: slugSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      // Convert undefined to null for the check
      const slug = input.slug ?? null;
      const available = await checkSlugAvailability(slug, ctx.user.id);
      return { available };
    }),

  update: protectedProcedure
    .input(
      z.object({
        data: z.object({
          title: z.string().optional().nullable(),
          slug: z.string().optional().nullable(),
          description: z.string().optional().nullable(),
          content: z.string().optional().nullable(),
          location: z.string().optional().nullable(),
          logoUrl: z.string().optional().nullable(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const slugInput = input.data.slug;
        let slug: string | null | undefined = undefined;

        // Only process slug if it's included in the input
        if ("slug" in input.data) {
          if (!slugInput) {
            // If null or empty string, set to null
            slug = null;
          } else {
            // If has value, validate it
            const isSlugValid = isValidSlug(slugInput);
            const isSlugAvailable = await checkSlugAvailability(
              slugInput,
              ctx.user.id,
            );
            if (!isSlugValid || !isSlugAvailable) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "This URL slug is invalid or already taken. Please choose another one.",
              });
            }
            slug = slugInput;
          }
        }

        const profile = await db.userProfile.upsert({
          where: { userId: ctx.user.id },
          create: {
            userId: ctx.user.id,
            ...input.data,
            slug: slug ?? ctx.user.id, // For create, we need a value
          },
          update: {
            ...input.data,
            ...(slug !== undefined && { slug }), // Only include if we processed it
          },
          include: profileInclude,
        });

        revalidatePath("/dashboard/profile");

        return profile;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

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

  updateContent: protectedProcedure
    .input(
      z.object({
        content: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const profile = await db.userProfile.update({
          where: { userId: ctx.user.id },
          data: {
            content: input.content,
          },
          include: profileInclude,
        });

        return profile;
      } catch (error) {
        console.error("Error updating content", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error updating content",
        });
      }
    }),
});
