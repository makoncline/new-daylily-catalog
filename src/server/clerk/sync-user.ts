import { clerkClient } from "@clerk/nextjs/server";
import type { EmailAddress, User } from "@clerk/nextjs/server";
import { kvStore as appKvStore } from "@/server/db/kvStore";
import { clerk } from "./client";

export const DEFAULT_USER_DATA = null;

export const getClerkUserKey = (clerkUserId: string) =>
  `clerk:user:${clerkUserId}`;

export async function syncClerkUserToKVBase(
  clerkUserId: string,
  clerk: Awaited<ReturnType<typeof clerkClient>>,
  kvStore: typeof appKvStore,
) {
  try {
    // Fetch user data from Clerk
    const clerkUser = await clerk.users.getUser(clerkUserId);

    if (!clerkUser) {
      const userData = DEFAULT_USER_DATA;
      await kvStore.set(getClerkUserKey(clerkUserId), userData);
      return userData;
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress;
    if (!email) {
      throw new Error("User must have a primary email address");
    }

    // Extract relevant user data
    const clerkUserData = {
      ...clerkUser,
      email,
    };

    // Store in KV
    await kvStore.set(getClerkUserKey(clerkUserId), clerkUserData);
    return clerkUserData;
  } catch (error) {
    console.error("Error syncing Clerk user data:", error);
    throw error;
  }
}

// Wrapper that uses app's default clients
export async function syncClerkUserToKV(clerkUserId: string) {
  return syncClerkUserToKVBase(clerkUserId, clerk, appKvStore);
}

export async function getClerkUserData(clerkUserId: string | null | undefined) {
  if (!clerkUserId) {
    return DEFAULT_USER_DATA;
  }

  // Try to get from cache first
  const cachedData = (await appKvStore.get(
    getClerkUserKey(clerkUserId),
  )) as ClerkUserData;

  if (cachedData) {
    return cachedData;
  }

  // If not in cache, sync from Clerk and cache it
  return syncClerkUserToKV(clerkUserId);
}

export type ClerkUserData = Awaited<ReturnType<typeof syncClerkUserToKV>>;
