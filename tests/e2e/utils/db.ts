import { clerkClient } from "@clerk/clerk-sdk-node";

export async function getClerkUserIdByEmail(
  email: string,
): Promise<string | null> {
  const clerkUsers = await clerkClient.users.getUserList({
    emailAddress: [email],
  });

  const clerkUser = clerkUsers.data[0];
  return clerkUser?.id ?? null;
}
