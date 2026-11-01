"use client";

import { createTRPCClient, type TRPCClient } from "@trpc/client";
import { type AppRouter } from "@/server/api/root";
import { createClientLinks, type GetSessionToken } from "./client-links";

let trpcClientSingleton: TRPCClient<AppRouter> | undefined;
let testOverrideClient: TRPCClient<AppRouter> | undefined;

export function createMemberClient(
  memberId: string,
  getToken: GetSessionToken,
) {
  return createTRPCClient<AppRouter>({
    links: createClientLinks(memberId, getToken),
  });
}

export function setTestTrpcClient(clientLike: TRPCClient<AppRouter>) {
  testOverrideClient = clientLike;
}

export function clearTestTrpcClient() {
  testOverrideClient = undefined;
}

export function resetTrpcClient() {
  testOverrideClient = undefined;
  trpcClientSingleton = undefined;
}

export function getTrpcClient() {
  if (testOverrideClient) return testOverrideClient;
  trpcClientSingleton ??= createTRPCClient<AppRouter>({
    links: createClientLinks(),
  });
  return trpcClientSingleton;
}
