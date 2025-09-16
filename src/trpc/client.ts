"use client";

import { createTRPCClient, type TRPCClient } from "@trpc/client";

export { getQueryClient } from "./query-client";
import { type AppRouter } from "@/server/api/root";
import { createClientLinks } from "./client-links";

let trpcClientSingleton: TRPCClient<AppRouter> | undefined;
export function getTrpcClient() {
  if (trpcClientSingleton) return trpcClientSingleton;
  trpcClientSingleton = createTRPCClient<AppRouter>({
    links: createClientLinks(),
  });
  return trpcClientSingleton;
}
