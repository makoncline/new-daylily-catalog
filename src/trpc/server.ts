import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { createCaller, type AppRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { createQueryClient } from "./query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(headers());
  heads.set("x-trpc-source", "rsc");

  // Get current user ID from Clerk
  const { userId } = await auth();

  // Add user ID to headers for tracking
  if (userId) {
    heads.set("x-user-id", userId);
  }

  return createTRPCContext({
    headers: heads,
  });
});

// Always create a fresh QueryClient per request
// This prevents cross-request contamination
const getQueryClient = () => createQueryClient();

const caller = createCaller(createContext);

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);
