import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });

let clientQueryClientSingleton: QueryClient | undefined = undefined;
export function getQueryClient() {
  if (typeof window === "undefined") {
    // For server usage, always return a fresh QueryClient
    return createQueryClient();
  }
  if (clientQueryClientSingleton) return clientQueryClientSingleton;
  clientQueryClientSingleton = createQueryClient();
  return clientQueryClientSingleton;
}
