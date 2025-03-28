import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { listFormSchema, listUpdateSchema } from "@/types/schemas/list";
import { listingInclude } from "./listing";
import { sortTitlesLettersBeforeNumbers } from "@/lib/utils/sort-utils";

const listInclude = {
  id: true,
  userId: true,
  title: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      listings: true,
    },
  },
};

export const listRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const list = await ctx.db.list.findUnique({
          where: {
            id: input.id,
            userId: ctx.user.id,
          },
          select: listInclude,
        });

        if (!list) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "List not found",
          });
        }

        return list;
      } catch (error) {
        console.error("Error fetching list:", error);
        throw new Error("Failed to fetch list");
      }
    }),

  create: protectedProcedure
    .input(listFormSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.list.create({
          data: {
            userId: ctx.user.id,
            title: input.title,
            description: input.description,
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
    .input(listUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.list.update({
          where: {
            id: input.id,
            userId: ctx.user.id,
          },
          data: {
            title: input.data.title,
            description: input.data.description,
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

  getListings: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const list = await ctx.db.list.findUnique({
          where: {
            id: input.id,
            userId: ctx.user.id,
          },
          include: {
            listings: {
              include: listingInclude,
            },
          },
        });

        if (!list) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "List not found",
          });
        }

        return sortTitlesLettersBeforeNumbers(list.listings);
      } catch (error) {
        console.error("Error fetching list listings:", error);
        throw new Error("Failed to fetch list listings");
      }
    }),

  addListings: protectedProcedure
    .input(
      z.object({
        listId: z.string(),
        listingIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const list = await ctx.db.list.update({
          where: {
            id: input.listId,
            userId: ctx.user.id,
          },
          data: {
            listings: {
              connect: input.listingIds.map((id) => ({ id })),
            },
          },
          include: {
            listings: true,
          },
        });

        return list.listings;
      } catch (error) {
        console.error("Error adding listings to list:", error);
        throw new Error("Failed to add listings to list");
      }
    }),

  removeListings: protectedProcedure
    .input(
      z.object({
        listId: z.string(),
        listingIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const list = await ctx.db.list.update({
          where: {
            id: input.listId,
            userId: ctx.user.id,
          },
          data: {
            listings: {
              disconnect: input.listingIds.map((id) => ({ id })),
            },
          },
          include: {
            listings: true,
          },
        });

        return list.listings;
      } catch (error) {
        console.error("Error removing listings from list:", error);
        throw new Error("Failed to remove listings from list");
      }
    }),

  count: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.list.count({
      where: { userId: ctx.user.id },
    });
  }),
});
