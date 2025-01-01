import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const ahsRouter = createTRPCRouter({
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.ahsListing.findMany({
        where: {
          name: {
            contains: input.query,
          },
        },
        take: 10,
        orderBy: {
          name: "asc",
        },
      });
    }),
});

export type AhsRouter = typeof ahsRouter;
