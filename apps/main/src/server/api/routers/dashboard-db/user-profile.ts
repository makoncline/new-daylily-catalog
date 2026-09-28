import { z } from "zod";
import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { profileFormSchema, slugSchema } from "@/types/schemas/profile";
import { isValidSlug } from "@/lib/utils/slugify";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  parseAndSanitizeEditorJsContent,
  sanitizeEditorJsContentForStorage,
} from "@/server/security/editor-js-content";
import {
  MAX_MEMBER_PROFILE_CONTENT_CHARS,
  prepareMemberProfileContent,
} from "@/server/security/member-profile-content";

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

function sanitizeBoundedProfileContent(content: string | null) {
  const sanitized = sanitizeEditorJsContentForStorage(content);
  if (sanitized && sanitized.length > MAX_MEMBER_PROFILE_CONTENT_CHARS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Profile content is too large.",
    });
  }
  return sanitized;
}

const reservedProfileSlugs = new Set([
  "_next",
  "auth-error",
  "catalog",
  "catalog-importer",
  "catalogs",
  "cultivar",
  "dashboard",
  "daylily-database-software",
  "kitchen-sink",
  "onboarding",
  "privacy",
  "sell-daylilies-online",
  "sign-in",
  "sign-up",
  "start-membership",
  "start-onboarding",
  "subscribe",
  "support",
  "terms",
  "users",
]);

async function checkSlugAvailability(
  db: PrismaClient,
  slug: string | null,
  userId: string,
): Promise<boolean> {
  if (!slug || slug === userId) {
    return true;
  }

  const normalizedSlug = slug.toLowerCase();
  if (
    !isValidSlug(normalizedSlug) ||
    reservedProfileSlugs.has(normalizedSlug)
  ) {
    return false;
  }

  const [existingProfile, existingUser] = await Promise.all([
    db.userProfile.findFirst({
      where: {
        slug: normalizedSlug,
        NOT: {
          userId,
        },
      },
      select: { id: true },
    }),
    db.user.findFirst({
      where: {
        id: normalizedSlug,
        NOT: {
          id: userId,
        },
      },
      select: { id: true },
    }),
  ]);

  return !existingProfile && !existingUser;
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
        expectedUpdatedAt: z.iso.datetime().nullable(),
        data: profileFormSchema.partial().strict(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      const data = {
        title: input.data.title,
        ...(slug !== undefined ? { slug } : {}),
        description: input.data.description,
        location: input.data.location,
        logoUrl: input.data.logoUrl,
      };
      if (input.expectedUpdatedAt === null) {
        try {
          return await ctx.db.userProfile.create({
            data: {
              ...data,
              userId: ctx.user.id,
              slug: slug ?? ctx.user.id,
            },
            select: profileSelect,
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "The profile changed. Load the latest version before saving.",
            });
          }
          throw error;
        }
      }

      const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
      const result = await ctx.db.userProfile.updateMany({
        where: { userId: ctx.user.id, updatedAt: expectedUpdatedAt },
        data: {
          ...data,
          updatedAt: new Date(
            Math.max(Date.now(), expectedUpdatedAt.getTime() + 1),
          ),
        },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "The profile changed. Load the latest version before saving.",
        });
      }
      return ctx.db.userProfile.findUniqueOrThrow({
        where: { userId: ctx.user.id },
        select: profileSelect,
      });
    }),

  updateBasic: protectedProcedure
    .input(
      z.object({
        expectedUpdatedAt: z.iso.datetime().nullable(),
        data: profileFormSchema.omit({ slug: true }).partial().strict(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.expectedUpdatedAt === null) {
        try {
          return await ctx.db.userProfile.create({
            data: {
              userId: ctx.user.id,
              slug: ctx.user.id,
              ...input.data,
            },
            select: profileSelect,
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "The profile changed. Load the latest version before saving.",
            });
          }
          throw error;
        }
      }

      const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
      const result = await ctx.db.userProfile.updateMany({
        where: { userId: ctx.user.id, updatedAt: expectedUpdatedAt },
        data: {
          ...input.data,
          updatedAt: new Date(
            Math.max(Date.now(), expectedUpdatedAt.getTime() + 1),
          ),
        },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "The profile changed. Load the latest version before saving.",
        });
      }
      return ctx.db.userProfile.findUniqueOrThrow({
        where: { userId: ctx.user.id },
        select: profileSelect,
      });
    }),

  updateContent: protectedProcedure
    .input(
      z.object({
        content: z.string().max(MAX_MEMBER_PROFILE_CONTENT_CHARS).nullable(),
        expectedUpdatedAt: z.iso.datetime(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sanitizedContent = sanitizeBoundedProfileContent(input.content);
      const result = await ctx.db.userProfile.updateMany({
        where: {
          userId: ctx.user.id,
          updatedAt: new Date(input.expectedUpdatedAt),
        },
        data: { content: sanitizedContent },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Profile changed. Read it again before replacing its content.",
        });
      }
      return ctx.db.userProfile.findUniqueOrThrow({
        where: { userId: ctx.user.id },
        select: profileSelect,
      });
    }),

  updateContentPreservingBlocks: protectedProcedure
    .input(
      z.strictObject({
        content: z.string().min(1).max(MAX_MEMBER_PROFILE_CONTENT_CHARS),
        expectedUpdatedAt: z.iso.datetime(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.userProfile.findUnique({
        where: { userId: ctx.user.id },
        select: { content: true },
      });
      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found.",
        });
      }
      const content = prepareMemberProfileContent(
        input.content,
        current.content,
      );
      const result = await ctx.db.userProfile.updateMany({
        where: {
          userId: ctx.user.id,
          updatedAt: new Date(input.expectedUpdatedAt),
        },
        data: { content },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Profile changed. Read it again before editing its content.",
        });
      }
      return ctx.db.userProfile.findUniqueOrThrow({
        where: { userId: ctx.user.id },
        select: profileSelect,
      });
    }),

  appendParagraph: protectedProcedure
    .input(
      z.object({
        paragraph: z.string().trim().min(1).max(4000),
        expectedUpdatedAt: z.iso.datetime(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.userProfile.findUnique({
        where: { userId: ctx.user.id },
        select: { content: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found.",
        });
      }
      const content = parseAndSanitizeEditorJsContent(existing.content);
      const nextContent = sanitizeBoundedProfileContent(
        JSON.stringify({
          time: Date.now(),
          version: content?.version ?? "2.30.8",
          blocks: [
            ...(content?.blocks ?? []),
            {
              id: randomUUID(),
              type: "paragraph",
              data: { text: input.paragraph },
            },
          ],
        }),
      );
      const updated = await ctx.db.userProfile.updateMany({
        where: {
          userId: ctx.user.id,
          updatedAt: new Date(input.expectedUpdatedAt),
        },
        data: { content: nextContent },
      });
      if (updated.count === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Profile changed. Read it again before appending a paragraph.",
        });
      }
      return ctx.db.userProfile.findUniqueOrThrow({
        where: { userId: ctx.user.id },
        select: profileSelect,
      });
    }),

  updateParagraph: protectedProcedure
    .input(
      z.object({
        blockId: z.string().trim().min(1),
        text: z.string().trim().min(1).max(4000),
        expectedUpdatedAt: z.iso.datetime(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.userProfile.findUnique({
        where: { userId: ctx.user.id },
        select: { content: true },
      });
      const content = parseAndSanitizeEditorJsContent(profile?.content ?? null);
      const matchingBlocks = content?.blocks.filter(
        (block) => block.id === input.blockId,
      );
      if (!content || matchingBlocks?.length !== 1) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile paragraph not found.",
        });
      }
      if (matchingBlocks[0]?.type !== "paragraph") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only a paragraph can be edited here.",
        });
      }

      const updatedContent = JSON.stringify({
        ...content,
        time: Date.now(),
        blocks: content.blocks.map((block) =>
          block.id === input.blockId
            ? { ...block, data: { text: input.text } }
            : block,
        ),
      });
      const result = await ctx.db.userProfile.updateMany({
        where: {
          userId: ctx.user.id,
          updatedAt: new Date(input.expectedUpdatedAt),
        },
        data: { content: sanitizeBoundedProfileContent(updatedContent) },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Profile changed. Read it again before editing a paragraph.",
        });
      }

      return ctx.db.userProfile.findUniqueOrThrow({
        where: { userId: ctx.user.id },
        select: profileSelect,
      });
    }),
});
