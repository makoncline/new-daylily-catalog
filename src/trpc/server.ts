import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { cache } from "react";

import { appRouter, type AppRouter } from "@/server/api/root";
import { createTRPCContext, t } from "@/server/api/trpc";
import { createQueryClient } from "./query-client";

const { createCallerFactory } = t;

const createCaller = createCallerFactory(appRouter);

const getQueryClient = cache(createQueryClient);

const getCaller = cache(async () => {
  const context = await createTRPCContext();
  return createCaller(context);
});

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  await getCaller(),
  getQueryClient,
);
