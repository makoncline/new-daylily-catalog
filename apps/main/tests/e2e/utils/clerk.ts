import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Delete a Clerk user by email address
 * Useful for cleaning up test users after e2e tests
 */
export async function deleteClerkUserByEmail(email: string): Promise<void> {
  try {
    const users = await clerkClient.users.getUserList({
      emailAddress: [email],
    });
    for (const user of users.data) {
      await clerkClient.users.deleteUser(user.id);
    }
  } catch (error) {
    console.error(`Error deleting Clerk user with email ${email}:`, error);
    // Don't throw - cleanup failures shouldn't break tests
  }
}

export async function getClerkUserIdByEmail(
  email: string,
): Promise<string | null> {
  const users = await clerkClient.users.getUserList({
    emailAddress: [email],
  });
  return users.data[0]?.id ?? null;
}
