import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { slugSchema } from "@/types/schemas/profile";
import { isValidSlug } from "@/lib/utils/slugify";
import type { PrismaClient } from "@prisma/client";

const profileSelect = {
  id: true,
  userId: true,
  title: true,
  slug: true,
  logoUrl: true,
  description: true,
  content: true,
  location: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function checkSlugAvailability(
  db: PrismaClient,
  slug: string | null,
  userId: string,
): Promise<boolean> {
  if (!slug || slug === userId) {
    return true;
  }

  const normalizedSlug = slug.toLowerCase();
  if (!isValidSlug(normalizedSlug)) {
    return false;
  }

  const existingProfile = await db.userProfile.findFirst({
    where: {
      slug: normalizedSlug,
      NOT: {
        userId,
      },
    },
    select: { id: true },
  });

  return !existingProfile;
}

export const dashboardDbUserProfileRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const existing = await ctx.db.userProfile.findUnique({
      where: { userId: ctx.user.id },
      select: profileSelect,
    });
    if (existing) return existing;

    return ctx.db.userProfile.create({
      data: {
        userId: ctx.user.id,
        slug: ctx.user.id,
      },
      select: profileSelect,
    });
  }),

  checkSlug: protectedProcedure
    .input(
      z.object({
        slug: slugSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const slug = input.slug ? input.slug.toLowerCase() : null;
      const available = await checkSlugAvailability(ctx.db, slug, ctx.user.id);
      return { available };
    }),

  update: protectedProcedure
    .input(
      z.object({
        data: z.object({
          title: z.string().optional().nullable(),
          slug: z.string().optional().nullable(),
          description: z.string().optional().nullable(),
          location: z.string().optional().nullable(),
          logoUrl: z.string().optional().nullable(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO(invalidation): keep profile edit invalidation centralized in this commit mutation.
      const shouldProcessSlug = Object.prototype.hasOwnProperty.call(
        input.data,
        "slug",
      );

      let slug: string | null | undefined = undefined;
      if (shouldProcessSlug) {
        const slugInput = input.data.slug;
        if (!slugInput) {
          slug = null;
        } else {
          const normalizedSlug = slugInput.toLowerCase();
          const available = await checkSlugAvailability(
            ctx.db,
            normalizedSlug,
            ctx.user.id,
          );
          if (!available) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "This URL is invalid or already taken.",
            });
          }
          slug = normalizedSlug;
        }
      }

      return ctx.db.userProfile.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          title: input.data.title,
          slug: slug ?? ctx.user.id,
          description: input.data.description,
          location: input.data.location,
          logoUrl: input.data.logoUrl,
        },
        update: {
          title: input.data.title,
          ...(slug !== undefined ? { slug } : {}),
          description: input.data.description,
          location: input.data.location,
          logoUrl: input.data.logoUrl,
        },
        select: profileSelect,
      });
    }),

  updateContent: protectedProcedure
    .input(z.object({ content: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.userProfile.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          slug: ctx.user.id,
          content: input.content,
        },
        update: {
          content: input.content,
        },
        select: profileSelect,
      });
    }),
});
