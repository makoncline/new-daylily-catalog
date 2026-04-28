import { clerkClient } from "@clerk/nextjs/server";

let clerkPromise: ReturnType<typeof clerkClient> | undefined;

export function getClerk() {
  clerkPromise ??= clerkClient();
  return clerkPromise;
}
