import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { cache } from "react";

import { appRouter, type AppRouter } from "@/server/api/root";
import { type Context } from "@/server/api/trpc";
import { createQueryClient } from "./query-client";
import { db } from "@/server/db";

const getQueryClient = cache(createQueryClient);

const getCaller = cache(async () => {
  const context: Context = {
    db,
    user: null, // Will be set by the protectedProcedure
  };

  return appRouter.createCaller(context);
});

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  await getCaller(),
  getQueryClient,
);
