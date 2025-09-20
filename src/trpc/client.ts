"use client";

import { createTRPCClient, type TRPCClient } from "@trpc/client";

export { getQueryClient } from "./query-client";
import { type AppRouter } from "@/server/api/root";
import { createClientLinks } from "./client-links";

let trpcClientSingleton: TRPCClient<AppRouter> | undefined;
let testOverrideClient: TRPCClient<AppRouter> | undefined;

export function setTestTrpcClient(clientLike: TRPCClient<AppRouter>) {
  testOverrideClient = clientLike;
}

export function clearTestTrpcClient() {
  testOverrideClient = undefined;
}
export function getTrpcClient() {
  if (testOverrideClient) return testOverrideClient;
  if (trpcClientSingleton) return trpcClientSingleton;
  trpcClientSingleton = createTRPCClient<AppRouter>({
    links: createClientLinks(),
  });
  return trpcClientSingleton;
}
