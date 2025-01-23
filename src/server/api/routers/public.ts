import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

export const publicRouter = createTRPCRouter({
  // Public procedures will go here
});
