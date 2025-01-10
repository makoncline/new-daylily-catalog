import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const listInclude = {
  id: true,
  name: true,
  intro: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      listings: true,
    },
  },
};

export const listRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        intro: z.string().optional(),
        bio: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.list.create({
          data: {
            userId: ctx.user.id,
            name: input.name,
            intro: input.intro,
            bio: input.bio,
          },
          select: listInclude,
        });

        return result;
      } catch (error) {
        console.error("Error creating list:", error);
        throw new Error("Failed to create list");
      }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const lists = await ctx.db.list.findMany({
        where: {
          userId: ctx.user.id,
        },
        select: listInclude,
        orderBy: {
          createdAt: "desc",
        },
      });

      return lists;
    } catch (error) {
      console.error("Error fetching lists:", error);
      throw new Error("Failed to fetch lists");
    }
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        intro: z.string().optional(),
        bio: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.list.update({
          where: {
            id: input.id,
            userId: ctx.user.id,
          },
          data: {
            name: input.name,
            intro: input.intro,
            bio: input.bio,
          },
          select: listInclude,
        });

        return result;
      } catch (error) {
        console.error("Error updating list:", error);
        throw new Error("Failed to update list");
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // First check if the list exists and belongs to the user
        const list = await ctx.db.list.findUnique({
          where: {
            id: input.id,
            userId: ctx.user.id,
          },
          include: {
            _count: {
              select: {
                listings: true,
              },
            },
          },
        });

        if (!list) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "List not found",
          });
        }

        // Check if the list has any listings
        if (list._count.listings > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Cannot delete list with associated listings. Remove all listings first.",
          });
        }

        // If we get here, it's safe to delete
        await ctx.db.list.delete({
          where: {
            id: input.id,
            userId: ctx.user.id,
          },
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error deleting list:", error);
        throw new Error("Failed to delete list");
      }
    }),
});
