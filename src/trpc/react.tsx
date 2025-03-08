"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { loggerLink, unstable_httpBatchStreamLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { useState, useEffect } from "react";
import SuperJSON from "superjson";
import { useAuth } from "@clerk/nextjs";

import { type AppRouter } from "@/server/api/root";
import { createQueryClient } from "./query-client";
import { getBaseUrl } from "../lib/utils/getBaseUrl";

export const api = createTRPCReact<AppRouter>({
  overrides: {
    useMutation: {
      async onSuccess(opts) {
        /**
         * @note that order here matters:
         * The order here allows route changes in `onSuccess` without
         * having a flash of content change whilst redirecting.
         **/
        // Calls the `onSuccess` defined in the `useQuery()`-options:
        await opts.originalFn();
        // Invalidate all queries in the react-query cache:
        await opts.queryClient.invalidateQueries();
      },
    },
  },
});

// Store QueryClients by user ID for complete isolation between users
const userQueryClients: Record<string, QueryClient> = {};

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [queryClient, setQueryClient] = useState<QueryClient>(() =>
    createQueryClient(),
  );

  // Update the query client when user changes
  useEffect(() => {
    if (userId) {
      // Create or reuse a specific QueryClient for this user
      if (!userQueryClients[userId]) {
        if (process.env.NODE_ENV === "development") {
          console.log(`Creating new QueryClient for user: ${userId}`);
        }
        userQueryClients[userId] = createQueryClient();
      }
      setQueryClient(userQueryClients[userId]);
    } else {
      // For unauthenticated users, use a fresh client
      if (process.env.NODE_ENV === "development") {
        console.log("Using anonymous QueryClient");
      }
      const anonClient = createQueryClient();
      setQueryClient(anonClient);

      // Clean up authenticated clients on logout for memory management
      // and to prevent potential stale data if the same user logs in again
      Object.keys(userQueryClients).forEach((key) => {
        if (process.env.NODE_ENV === "development") {
          console.log(`Clearing QueryClient for user: ${key}`);
        }
        const client = userQueryClients[key];
        if (client) {
          client.clear();
        }
        delete userQueryClients[key];
      });
    }
  }, [userId]);

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        unstable_httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + "/api/trpc",
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");

            // Include user ID in headers for server-side tracking
            if (userId) {
              headers.set("x-user-id", userId);
            }

            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}
