import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Default stale time for general queries
        staleTime: 30 * 1000,

        // Conservative garbage collection time
        gcTime: 5 * 60 * 1000, // 5 minutes
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        // Control which queries should be included in SSR dehydration
        shouldDehydrateQuery: (query) => {
          const queryKey = query.queryKey;
          // Skip dehydration for user-specific queries to prevent
          // cross-user contamination during SSR
          if (
            Array.isArray(queryKey) &&
            queryKey.length > 0 &&
            typeof queryKey[0] === "string" &&
            queryKey[0].includes("user-")
          ) {
            return false; // Don't dehydrate user-specific data
          }

          // Default behavior for non-user-specific data
          return (
            defaultShouldDehydrateQuery(query) ||
            query.state.status === "pending"
          );
        },
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
