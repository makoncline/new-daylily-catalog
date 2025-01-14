import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { kvStore } from "@/server/db/kvStore";

export const kvRouter = createTRPCRouter({
  // Set a value in the KV store
  set: publicProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.unknown(),
      }),
    )
    .mutation(async ({ input }) => {
      await kvStore.set(input.key, input.value);
      return { success: true };
    }),

  // Get a value from the KV store
  get: publicProcedure
    .input(
      z.object({
        key: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const value = await kvStore.get(input.key);
      return { value };
    }),

  // Delete a value from the KV store
  delete: publicProcedure
    .input(
      z.object({
        key: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await kvStore.delete(input.key);
      return { success: true };
    }),
});
